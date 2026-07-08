import { NextRequest, NextResponse } from "next/server";
import {
  getBountyById,
  getSubmissionById,
  updateSubmission,
  updateBounty,
} from "@/lib/repository";
import { isAdminRequest, adminUnauthorizedResponse } from "@/lib/admin-auth";
import { isCreatorOfBountyAsync, creatorUnauthorizedResponse } from "@/lib/creator-auth";
import { applySubmissionReview } from "@/lib/submission-review";
import { notifySubmissionPaid } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const submission = await getSubmissionById(id);

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const bounty = await getBountyById(submission.bountyId);
  const isAdmin = isAdminRequest(request);
  const isCreator = await isCreatorOfBountyAsync(request, bounty);

  if (body.status === "approved" || body.status === "rejected") {
    if (!isAdmin && !isCreator) {
      return creatorUnauthorizedResponse();
    }

    const result = await applySubmissionReview(id, body.status, body.reviewNotes);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ submission: result.submission });
  }

  if (body.status === "paid") {
    if (!isAdmin && !isCreator) {
      return adminUnauthorizedResponse();
    }

    if (typeof body.payoutTxHash !== "string") {
      return NextResponse.json({ error: "payoutTxHash required" }, { status: 400 });
    }

    if (!bounty?.escrowAddress) {
      return NextResponse.json({ error: "On-chain escrow required" }, { status: 400 });
    }

    if (submission.status !== "approved" && !isAdmin) {
      return NextResponse.json({ error: "Submission must be approved first" }, { status: 400 });
    }

    await updateSubmission(id, {
      status: "paid",
      payoutTxHash: body.payoutTxHash,
    });
    await updateBounty(submission.bountyId, { status: "paid" });

    if (bounty) {
      await notifySubmissionPaid(
        submission.hunterAddress,
        bounty.id,
        bounty.title,
        bounty.rewardUsdc
      );
    }

    const updated = await getSubmissionById(id);
    return NextResponse.json({ submission: updated });
  }

  if (isAdmin) {
    await updateSubmission(id, body);
    const updated = await getSubmissionById(id);
    return NextResponse.json({ submission: updated });
  }

  return adminUnauthorizedResponse();
}

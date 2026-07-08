import { NextRequest, NextResponse } from "next/server";
import {
  getDisputeById,
  resolveDispute,
  updateBounty,
  getBountyById,
  updateSubmission,
} from "@/lib/repository";
import { isAdminRequest, adminUnauthorizedResponse } from "@/lib/admin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const body = await request.json();
  const action = body.action as "dismiss" | "uphold";

  if (action !== "dismiss" && action !== "uphold") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await getDisputeById(id);
  if (!existing || existing.status !== "open") {
    return NextResponse.json({ error: "Dispute not found or already closed" }, { status: 404 });
  }

  const bounty = await getBountyById(existing.bountyId);
  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  const status = action === "dismiss" ? "dismissed" : "resolved";
  const dispute = await resolveDispute(id, status, body.resolutionNotes);

  if (action === "dismiss") {
    await updateBounty(existing.bountyId, { status: "approved" });
  } else {
    await updateBounty(existing.bountyId, { status: "cancelled" });
    await updateSubmission(existing.submissionId, { status: "rejected" });
  }

  return NextResponse.json({ dispute });
}

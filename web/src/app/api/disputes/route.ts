import { NextRequest, NextResponse } from "next/server";
import {
  getBountyById,
  getSubmissionById,
  getDisputesByBounty,
  createDispute,
  updateBounty,
} from "@/lib/repository";
import { canFileDispute } from "@/lib/disputes";
import { alertNewDispute } from "@/lib/email-alerts";
import type { CreateDisputeInput } from "@/lib/types";

function walletFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-wallet-address");
}

export async function GET(request: NextRequest) {
  const bountyId = request.nextUrl.searchParams.get("bountyId");
  if (!bountyId) {
    return NextResponse.json({ error: "bountyId required" }, { status: 400 });
  }

  const disputes = await getDisputesByBounty(bountyId);
  return NextResponse.json({ disputes });
}

export async function POST(request: NextRequest) {
  try {
    const headerWallet = walletFromRequest(request);
    const body: CreateDisputeInput = await request.json();

    if (!headerWallet || !body.filerAddress) {
      return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
    }

    const walletMatch =
      headerWallet === body.filerAddress ||
      (headerWallet.length <= 42 &&
        body.filerAddress.length <= 42 &&
        headerWallet.toLowerCase() === body.filerAddress.toLowerCase());

    if (!walletMatch) {
      return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
    }

    if (!body.bountyId || !body.submissionId || !body.reason?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [bounty, submission] = await Promise.all([
      getBountyById(body.bountyId),
      getSubmissionById(body.submissionId),
    ]);

    if (!bounty || !submission) {
      return NextResponse.json({ error: "Bounty or submission not found" }, { status: 404 });
    }

    if (!canFileDispute(bounty, submission, body.filerAddress)) {
      return NextResponse.json({ error: "Not eligible to file dispute" }, { status: 400 });
    }

    const existing = (await getDisputesByBounty(body.bountyId)).find((d) => d.status === "open");
    if (existing) {
      return NextResponse.json({ error: "A dispute is already open" }, { status: 400 });
    }

    const dispute = await createDispute({
      bountyId: body.bountyId,
      submissionId: body.submissionId,
      filerAddress: body.filerAddress,
      reason: body.reason.trim(),
    });

    await updateBounty(body.bountyId, { status: "disputed" });
    void alertNewDispute(bounty.title, bounty.id, body.reason.trim());

    return NextResponse.json({ dispute }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

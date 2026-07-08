import { NextRequest, NextResponse } from "next/server";
import { getBountyById, getSubmissions, createSubmission } from "@/lib/repository";
import { notifySubmissionReceived } from "@/lib/notifications";
import { alertNewSubmission } from "@/lib/email-alerts";
import type { CreateSubmissionInput } from "@/lib/types";
export async function GET(request: NextRequest) {
  const bountyId = request.nextUrl.searchParams.get("bountyId") ?? undefined;
  const submissions = await getSubmissions(bountyId);
  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSubmissionInput = await request.json();

    if (!body.bountyId || !body.hunterAddress || !body.proofUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bounty = await getBountyById(body.bountyId);
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    if (bounty.status !== "open") {
      return NextResponse.json({ error: "Bounty is not accepting submissions" }, { status: 400 });
    }

    const submission = await createSubmission({
      bountyId: body.bountyId,
      hunterAddress: body.hunterAddress,
      proofUrl: body.proofUrl,
      proofDescription: body.proofDescription ?? "",
    });

    await notifySubmissionReceived(
      bounty.creatorAddress,
      bounty.id,
      bounty.title
    );
    void alertNewSubmission(bounty.title, bounty.id);

    return NextResponse.json({ submission }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

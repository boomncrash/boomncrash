import { NextRequest, NextResponse } from "next/server";
import { getBounties, createBounty } from "@/lib/repository";
import { enrichBountiesWithCreatorBadges } from "@/lib/bounty-enrichment";
import { PROHIBITED_KEYWORDS } from "@/lib/constants";
import { containsProhibitedContent } from "@/lib/utils";
import { alertNewBounty } from "@/lib/email-alerts";
import type { CreateBountyInput } from "@/lib/types";
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const chain = searchParams.get("chain") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const rally = searchParams.get("rally") === "true";
  const includeBadges = searchParams.get("badges") !== "false";

  const bountyList = await getBounties({ chain, category, status, rally });
  const bounties = includeBadges
    ? await enrichBountiesWithCreatorBadges(bountyList)
    : bountyList;

  return NextResponse.json({ bounties });
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBountyInput = await request.json();

    if (!body.title || !body.description || !body.deliverables || !body.creatorAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const combined = `${body.title} ${body.description} ${body.deliverables}`;
    if (containsProhibitedContent(combined, PROHIBITED_KEYWORDS)) {
      return NextResponse.json({ error: "Prohibited content detected" }, { status: 400 });
    }

    const bounty = await createBounty({
      title: body.title,
      description: body.description,
      deliverables: body.deliverables,
      category: body.category,
      chain: body.chain,
      rewardUsdc: body.rewardUsdc,
      creatorAddress: body.creatorAddress,
      deadline: new Date(body.deadline).toISOString(),
      escrowAddress: body.escrowAddress,
      txHash: body.txHash,
      isRally: body.isRally,
    });

    if (bounty.status === "pending_moderation") {
      void alertNewBounty(bounty.title, bounty.rewardUsdc, bounty.chain);
    }

    return NextResponse.json({ bounty }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

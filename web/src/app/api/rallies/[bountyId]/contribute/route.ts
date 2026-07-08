import { NextRequest, NextResponse } from "next/server";
import { contributeToRally, getBountyById } from "@/lib/repository";
import { detectRallyMilestone, notifyRallyMilestone } from "@/lib/rally-webhooks";
import { notifyRallyMilestone as notifyRallyInApp, notifyRallyFunded } from "@/lib/notifications";
import { alertRallyFunded } from "@/lib/email-alerts";
import type { CreateRallyContributionInput } from "@/lib/types";

interface RouteParams {
  params: Promise<{ bountyId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { bountyId } = await params;
    const body: CreateRallyContributionInput = await request.json();

    if (!body.backerAddress || !body.amountUsdc || body.amountUsdc <= 0) {
      return NextResponse.json({ error: "Invalid contribution" }, { status: 400 });
    }

    const bounty = await getBountyById(bountyId);
    if (!bounty?.isRally) {
      return NextResponse.json({ error: "Not a Rally bounty" }, { status: 400 });
    }
    if (bounty.status !== "funding") {
      return NextResponse.json({ error: "Rally is no longer accepting contributions" }, { status: 400 });
    }

    const previousFunded = bounty.rallyFunded ?? 0;
    const remaining = bounty.rewardUsdc - previousFunded;
    if (body.amountUsdc > remaining) {
      return NextResponse.json(
        { error: `Maximum contribution is ${remaining} USDC` },
        { status: 400 }
      );
    }

    const result = await contributeToRally(bountyId, {
      backerAddress: body.backerAddress,
      amountUsdc: body.amountUsdc,
      chain: body.chain ?? bounty.chain,
      txHash: body.txHash,
    });

    if (!result) {
      return NextResponse.json({ error: "Contribution failed" }, { status: 400 });
    }

    const milestone = detectRallyMilestone(bounty, previousFunded, result.bounty.rallyFunded ?? 0);
    if (milestone) {
      await notifyRallyMilestone(result.bounty, milestone, {
        backerAddress: body.backerAddress,
        amountUsdc: body.amountUsdc,
      });

      if (milestone === "50_percent") {
        await notifyRallyInApp(bounty.creatorAddress, bountyId, bounty.title, 50);
      }
      if (milestone === "fully_funded") {
        await notifyRallyFunded(bounty.creatorAddress, bountyId, bounty.title);
        void alertRallyFunded(bounty.title, bounty.rewardUsdc);
      }
    }

    return NextResponse.json({ ...result, milestone }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

import type { Bounty } from "@/lib/types";
import { rallyProgressPercent } from "@/lib/utils";

export type RallyMilestone = "50_percent" | "fully_funded";

export function detectRallyMilestone(
  bounty: Bounty,
  previousFunded: number,
  newFunded: number
): RallyMilestone | null {
  if (!bounty.isRally) return null;

  const target = bounty.rewardUsdc;
  const prevPct = rallyProgressPercent(target, previousFunded);
  const newPct = rallyProgressPercent(target, newFunded);

  if (newFunded >= target && previousFunded < target) {
    return "fully_funded";
  }
  if (prevPct < 50 && newPct >= 50) {
    return "50_percent";
  }

  return null;
}

export async function notifyRallyMilestone(
  bounty: Bounty,
  milestone: RallyMilestone,
  contribution?: { backerAddress: string; amountUsdc: number }
): Promise<void> {
  const webhookUrl = process.env.RALLY_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: `rally.${milestone}`,
        milestone,
        bounty: {
          id: bounty.id,
          title: bounty.title,
          rewardUsdc: bounty.rewardUsdc,
          rallyFunded: bounty.rallyFunded,
          backerCount: bounty.backerCount,
          status: bounty.status,
          chain: bounty.chain,
        },
        contribution,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Non-blocking — webhook failures should not break contributions
  }
}

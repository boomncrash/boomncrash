import type { Bounty, BountyCategory } from "@/lib/types";
import { BOUNTY_CATEGORIES } from "@/lib/constants";
import { getCategorySubscribers } from "@/lib/repository";
import { notify } from "@/lib/notifications";

function addressesEqual(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export async function notifyCategorySubscribers(bounty: Bounty): Promise<void> {
  if (bounty.status !== "open") return;

  const subscribers = await getCategorySubscribers(bounty.category as BountyCategory);
  const categoryLabel =
    BOUNTY_CATEGORIES.find((c) => c.id === bounty.category)?.label ?? bounty.category;

  for (const walletAddress of subscribers) {
    if (addressesEqual(walletAddress, bounty.creatorAddress)) continue;

    await notify({
      walletAddress,
      type: "bounty_available",
      title: `New ${categoryLabel} bounty`,
      message: `"${bounty.title}" — $${bounty.rewardUsdc} USDC on ${bounty.chain}`,
      link: `/bounty/${bounty.id}`,
    });
  }
}

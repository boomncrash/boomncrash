import type { HunterProfile } from "@/lib/types";
import { computeHunterProfile } from "@/lib/profile";
import type { Bounty, Submission, RallyContribution } from "@/lib/types";

export function collectUniqueAddresses(
  bounties: Bounty[],
  submissions: Submission[],
  contributions: RallyContribution[] = []
): string[] {
  const seen = new Map<string, string>();

  const add = (addr: string) => {
    const key = addr.length > 40 ? addr : addr.toLowerCase();
    if (!seen.has(key)) seen.set(key, addr);
  };

  for (const s of submissions) add(s.hunterAddress);
  for (const b of bounties) add(b.creatorAddress);
  for (const c of contributions) add(c.backerAddress);

  return Array.from(seen.values());
}

export function buildLeaderboard(
  bounties: Bounty[],
  submissions: Submission[],
  contributions: RallyContribution[] = [],
  limit = 50
): HunterProfile[] {
  const addresses = collectUniqueAddresses(bounties, submissions, contributions);

  return addresses
    .map((address) => computeHunterProfile(address, bounties, submissions, contributions))
    .filter((p) => p.reputationScore > 0 || p.completedBounties > 0)
    .sort((a, b) => {
      if (b.reputationScore !== a.reputationScore) {
        return b.reputationScore - a.reputationScore;
      }
      return b.totalEarnedUsdc - a.totalEarnedUsdc;
    })
    .slice(0, limit);
}

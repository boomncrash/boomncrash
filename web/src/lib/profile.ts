import type { Bounty, Submission, RallyContribution } from "@/lib/types";
import type { HunterProfile } from "@/lib/types";

function addressesEqual(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export function computeHunterProfile(
  address: string,
  allBounties: Bounty[],
  allSubmissions: Submission[],
  rallyContributions: RallyContribution[] = []
): HunterProfile {
  const hunterSubs = allSubmissions.filter((s) =>
    addressesEqual(s.hunterAddress, address)
  );
  const created = allBounties.filter((b) =>
    addressesEqual(b.creatorAddress, address)
  );
  const backed = rallyContributions.filter((c) =>
    addressesEqual(c.backerAddress, address)
  );

  const paid = hunterSubs.filter((s) => s.status === "paid");
  const approved = hunterSubs.filter((s) => s.status === "approved");
  const rejected = hunterSubs.filter((s) => s.status === "rejected");
  const reviewed = approved.length + rejected.length + paid.length;

  const totalEarnedUsdc = paid.reduce((sum, sub) => {
    const bounty = allBounties.find((b) => b.id === sub.bountyId);
    if (!bounty) return sum;
    return sum + bounty.rewardUsdc * 0.97;
  }, 0);

  const reputationScore =
    paid.length * 10 +
    approved.length * 3 -
    rejected.length * 2 +
    created.filter((b) => b.status === "paid").length * 5;

  const earliest = [
    ...hunterSubs.map((s) => s.createdAt),
    ...created.map((b) => b.createdAt),
    ...backed.map((c) => c.createdAt),
  ].sort();

  return {
    address,
    reputationScore: Math.max(0, reputationScore),
    completedBounties: paid.length,
    totalEarnedUsdc: Math.round(totalEarnedUsdc * 100) / 100,
    submissionsCount: hunterSubs.length,
    bountiesCreated: created.length,
    approvalRate: reviewed > 0 ? Math.round((paid.length / reviewed) * 100) : 0,
    rallyBacked: backed.length,
    memberSince: earliest[0] ?? new Date().toISOString(),
  };
}

export function reputationTier(score: number): { label: string; color: string } {
  if (score >= 50) return { label: "Elite Hunter", color: "#f59e0b" };
  if (score >= 25) return { label: "Pro Hunter", color: "#10b981" };
  if (score >= 10) return { label: "Rising Hunter", color: "#06b6d4" };
  return { label: "New Hunter", color: "#a1a1aa" };
}

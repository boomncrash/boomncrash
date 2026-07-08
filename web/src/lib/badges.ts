import type { HunterProfile, Submission, RallyContribution } from "@/lib/types";

export interface Badge {
  id: string;
  label: string;
  description: string;
  emoji: string;
  color: string;
}

export const BADGE_DEFINITIONS: Record<string, Omit<Badge, "id">> = {
  first_blood: {
    label: "First Blood",
    description: "Completed your first bounty",
    emoji: "🎯",
    color: "#10b981",
  },
  proven_hunter: {
    label: "Proven Hunter",
    description: "Completed 5+ bounties",
    emoji: "⚡",
    color: "#06b6d4",
  },
  elite: {
    label: "Elite",
    description: "Reached 50+ reputation",
    emoji: "👑",
    color: "#f59e0b",
  },
  high_earner: {
    label: "High Earner",
    description: "Earned $100+ USDC",
    emoji: "💰",
    color: "#22c55e",
  },
  creator: {
    label: "Creator",
    description: "Posted your first bounty",
    emoji: "📋",
    color: "#8b5cf6",
  },
  rally_backer: {
    label: "Rally Backer",
    description: "Backed a Rally bounty",
    emoji: "🤝",
    color: "#06b6d4",
  },
  globetrotter: {
    label: "Globetrotter",
    description: "Submissions on 3+ bounties",
    emoji: "🌍",
    color: "#3b82f6",
  },
  trusted: {
    label: "Trusted",
    description: "80%+ approval rate with 3+ reviews",
    emoji: "✅",
    color: "#14b8a6",
  },
};

function addressesEqual(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export function computeBadges(
  profile: HunterProfile,
  submissions: Submission[] = [],
  contributions: RallyContribution[] = []
): Badge[] {
  const hunterSubs = submissions.filter((s) =>
    addressesEqual(s.hunterAddress, profile.address)
  );
  const uniqueBountySubs = new Set(hunterSubs.map((s) => s.bountyId)).size;
  const reviewed = hunterSubs.filter((s) =>
    ["approved", "rejected", "paid"].includes(s.status)
  ).length;

  const earned: string[] = [];

  if (profile.completedBounties >= 1) earned.push("first_blood");
  if (profile.completedBounties >= 5) earned.push("proven_hunter");
  if (profile.reputationScore >= 50) earned.push("elite");
  if (profile.totalEarnedUsdc >= 100) earned.push("high_earner");
  if (profile.bountiesCreated >= 1) earned.push("creator");
  if (profile.rallyBacked >= 1 || contributions.length > 0) earned.push("rally_backer");
  if (uniqueBountySubs >= 3) earned.push("globetrotter");
  if (reviewed >= 3 && profile.approvalRate >= 80) earned.push("trusted");

  return earned.map((id) => ({
    id,
    ...BADGE_DEFINITIONS[id],
  }));
}

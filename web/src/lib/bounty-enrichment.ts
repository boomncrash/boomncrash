import type { Bounty } from "@/lib/types";
import { computeBadges } from "@/lib/badges";
import { computeHunterProfile, reputationTier } from "@/lib/profile";
import {
  getBounties,
  getSubmissions,
  getAllRallyContributions,
} from "@/lib/repository";

function addressesEqual(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export async function buildCreatorBadgesMap(
  bountyList: Bounty[]
): Promise<Map<string, ReturnType<typeof computeBadges>>> {
  const creators = [...new Set(bountyList.map((b) => b.creatorAddress))];
  if (creators.length === 0) return new Map();

  const [allBounties, allSubmissions, allContributions] = await Promise.all([
    getBounties(),
    getSubmissions(),
    getAllRallyContributions(),
  ]);

  const map = new Map<string, ReturnType<typeof computeBadges>>();

  for (const address of creators) {
    const backed = allContributions.filter((c) =>
      addressesEqual(c.backerAddress, address)
    );
    const profile = computeHunterProfile(address, allBounties, allSubmissions, backed);
    map.set(address, computeBadges(profile, allSubmissions, backed).slice(0, 3));
  }

  return map;
}

export async function enrichBountiesWithCreatorBadges<T extends Bounty>(
  bountyList: T[]
): Promise<
  (T & {
    creatorBadges: ReturnType<typeof computeBadges>;
    creatorTier: { label: string; color: string };
    creatorReputationScore: number;
  })[]
> {
  const badgeMap = await buildCreatorBadgesMap(bountyList);
  const creators = [...new Set(bountyList.map((b) => b.creatorAddress))];

  const [allBounties, allSubmissions, allContributions] = await Promise.all([
    getBounties(),
    getSubmissions(),
    getAllRallyContributions(),
  ]);

  const tierMap = new Map<string, { tier: ReturnType<typeof reputationTier>; score: number }>();
  for (const address of creators) {
    const backed = allContributions.filter((c) =>
      addressesEqual(c.backerAddress, address)
    );
    const profile = computeHunterProfile(address, allBounties, allSubmissions, backed);
    tierMap.set(address, {
      tier: reputationTier(profile.reputationScore),
      score: profile.reputationScore,
    });
  }

  return bountyList.map((bounty) => {
    const meta = tierMap.get(bounty.creatorAddress);
    return {
      ...bounty,
      creatorBadges: badgeMap.get(bounty.creatorAddress) ?? [],
      creatorTier: meta?.tier ?? reputationTier(0),
      creatorReputationScore: meta?.score ?? 0,
    };
  });
}

import type { HunterProfile } from "@/lib/types";
import { computeHunterProfile, reputationTier } from "@/lib/profile";
import {
  getBounties,
  getSubmissions,
  getAllRallyContributions,
} from "@/lib/repository";

export interface HunterRepSummary {
  address: string;
  reputationScore: number;
  completedBounties: number;
  tier: { label: string; color: string };
}

function addressesEqual(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export async function buildHunterRepMap(
  addresses: string[]
): Promise<Map<string, HunterRepSummary>> {
  const unique = [...new Set(addresses)];
  if (unique.length === 0) return new Map();

  const [allBounties, allSubmissions, allContributions] = await Promise.all([
    getBounties(),
    getSubmissions(),
    getAllRallyContributions(),
  ]);

  const map = new Map<string, HunterRepSummary>();

  for (const address of unique) {
    const backed = allContributions.filter((c) =>
      addressesEqual(c.backerAddress, address)
    );
    const profile: HunterProfile = computeHunterProfile(
      address,
      allBounties,
      allSubmissions,
      backed
    );
    map.set(address, {
      address,
      reputationScore: profile.reputationScore,
      completedBounties: profile.completedBounties,
      tier: reputationTier(profile.reputationScore),
    });
  }

  return map;
}

export function lookupHunterRep(
  map: Map<string, HunterRepSummary>,
  address: string
): HunterRepSummary | undefined {
  const direct = map.get(address);
  if (direct) return direct;
  for (const [key, rep] of map) {
    if (addressesEqual(key, address)) return rep;
  }
  return undefined;
}

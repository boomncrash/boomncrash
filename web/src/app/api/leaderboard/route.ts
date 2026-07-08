import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/repository";
import { reputationTier } from "@/lib/profile";

export async function GET() {
  const leaders = await getLeaderboard(50);
  const ranked = leaders.map((profile, index) => ({
    rank: index + 1,
    profile,
    tier: reputationTier(profile.reputationScore),
  }));

  return NextResponse.json({ leaders: ranked });
}

import { NextRequest, NextResponse } from "next/server";
import { getHunterProfile, getSubmissions, getBounties } from "@/lib/repository";
import { reputationTier } from "@/lib/profile";

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);

  const profile = await getHunterProfile(decoded);
  const tier = reputationTier(profile.reputationScore);

  const allSubmissions = await getSubmissions();
  const allBounties = await getBounties();

  const recentSubmissions = allSubmissions
    .filter(
      (s) =>
        s.hunterAddress === decoded ||
        s.hunterAddress.toLowerCase() === decoded.toLowerCase()
    )
    .slice(0, 5);

  const recentBounties = allBounties
    .filter(
      (b) =>
        b.creatorAddress === decoded ||
        b.creatorAddress.toLowerCase() === decoded.toLowerCase()
    )
    .slice(0, 5);

  return NextResponse.json({
    profile,
    tier,
    recentSubmissions,
    recentBounties,
  });
}

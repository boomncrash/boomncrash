import { NextRequest, NextResponse } from "next/server";
import { getBounties, getSubmissions, getOpenDisputes, getReferralLeaderboard, getTotalReferrals } from "@/lib/repository";
import { isAdminRequest, adminUnauthorizedResponse } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return adminUnauthorizedResponse();
  }

  const pendingBounties = (await getBounties()).filter(
    (b) => b.status === "pending_moderation"
  );
  const pendingSubmissions = (await getSubmissions()).filter(
    (s) => s.status === "pending"
  );
  const fundingRallies = (await getBounties({ rally: true })).filter(
    (b) => b.status === "funding"
  );
  const openDisputes = await getOpenDisputes();
  const [referralLeaderboard, totalReferrals] = await Promise.all([
    getReferralLeaderboard(10),
    getTotalReferrals(),
  ]);

  return NextResponse.json({
    pendingBounties,
    pendingSubmissions,
    fundingRallies,
    openDisputes,
    referralLeaderboard,
    totalReferrals,
  });
}

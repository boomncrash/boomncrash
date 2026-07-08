import { NextRequest, NextResponse } from "next/server";
import { getReferralStats } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  const stats = await getReferralStats(wallet);
  return NextResponse.json(stats);
}

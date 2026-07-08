import { NextRequest, NextResponse } from "next/server";
import { getReferralStats } from "@/lib/repository";

function walletFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-wallet-address");
}

export async function GET(request: NextRequest) {
  const wallet =
    request.nextUrl.searchParams.get("wallet") ?? walletFromRequest(request);

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  const stats = await getReferralStats(wallet);
  return NextResponse.json(stats);
}

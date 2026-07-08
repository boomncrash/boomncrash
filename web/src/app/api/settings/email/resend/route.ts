import { NextRequest, NextResponse } from "next/server";
import { resendVerificationEmail } from "@/lib/email-verification";

function walletFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-wallet-address");
}

export async function POST(request: NextRequest) {
  const wallet = walletFromRequest(request);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
  }

  const result = await resendVerificationEmail(wallet);
  if (!result.sent) {
    return NextResponse.json({ error: result.error ?? "Could not resend" }, { status: 400 });
  }

  return NextResponse.json({ sent: true });
}

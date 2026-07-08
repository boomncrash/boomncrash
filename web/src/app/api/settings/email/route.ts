import { NextRequest, NextResponse } from "next/server";
import { getEmailPreferences } from "@/lib/repository";
import { issueEmailVerification } from "@/lib/email-verification";

function walletFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-wallet-address");
}

function addressesMatch(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet parameter required" }, { status: 400 });
  }

  const prefs = await getEmailPreferences(wallet);
  return NextResponse.json({ preferences: prefs ?? null });
}

export async function PUT(request: NextRequest) {
  try {
    const headerWallet = walletFromRequest(request);
    const body = await request.json();

    if (!headerWallet || !body.walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    if (!addressesMatch(headerWallet, body.walletAddress)) {
      return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
    }

    if (!body.email || !EMAIL_RE.test(body.email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const existing = await getEmailPreferences(body.walletAddress);
    const emailChanged = !existing || existing.email !== email;

    const prefs = {
      enabled: body.enabled !== false,
      notifySubmissions: body.notifySubmissions !== false,
      notifyReviews: body.notifyReviews !== false,
      notifyPayouts: body.notifyPayouts !== false,
      notifyRally: body.notifyRally !== false,
      notifyNewBounties: body.notifyNewBounties !== false,
    };

    const { preferences, verificationSent } = await issueEmailVerification(
      body.walletAddress,
      email,
      prefs,
      emailChanged
    );

    return NextResponse.json({ preferences, verificationSent });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

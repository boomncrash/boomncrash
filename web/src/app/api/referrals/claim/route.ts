import { NextRequest, NextResponse } from "next/server";
import { claimReferral } from "@/lib/repository";

function walletFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-wallet-address");
}

function walletsMatch(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const headerWallet = walletFromRequest(request);
    const body = await request.json();
    const { refereeAddress, referrerAddress } = body as {
      refereeAddress?: string;
      referrerAddress?: string;
    };

    if (!headerWallet || !refereeAddress || !referrerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!walletsMatch(headerWallet, refereeAddress)) {
      return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
    }

    const attribution = await claimReferral(refereeAddress, referrerAddress);
    if (!attribution) {
      return NextResponse.json({ error: "Invalid referral" }, { status: 400 });
    }

    return NextResponse.json({ attribution }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

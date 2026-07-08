import { NextRequest, NextResponse } from "next/server";
import { getCategorySubscriptions, setCategorySubscriptions } from "@/lib/repository";
import type { BountyCategory } from "@/lib/types";
import { BOUNTY_CATEGORIES } from "@/lib/constants";

function walletFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-wallet-address");
}

function addressesMatch(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

const VALID_CATEGORIES = new Set(BOUNTY_CATEGORIES.map((c) => c.id));

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet parameter required" }, { status: 400 });
  }

  const categories = await getCategorySubscriptions(wallet);
  return NextResponse.json({ categories });
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

    const raw: unknown[] = Array.isArray(body.categories) ? body.categories : [];
    const categories = raw.filter(
      (c): c is BountyCategory => typeof c === "string" && VALID_CATEGORIES.has(c as BountyCategory)
    );

    const saved = await setCategorySubscriptions(body.walletAddress, categories);
    return NextResponse.json({ categories: saved });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

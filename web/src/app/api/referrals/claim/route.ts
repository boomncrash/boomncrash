import { NextRequest, NextResponse } from "next/server";
import { claimReferral } from "@/lib/repository";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refereeAddress, referrerAddress } = body as {
      refereeAddress?: string;
      referrerAddress?: string;
    };

    if (!refereeAddress || !referrerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

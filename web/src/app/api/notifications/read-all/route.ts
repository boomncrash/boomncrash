import { NextRequest, NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/repository";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.walletAddress) {
    return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
  }

  await markAllNotificationsRead(body.walletAddress);
  return NextResponse.json({ success: true });
}

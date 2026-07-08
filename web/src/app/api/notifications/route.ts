import { NextRequest, NextResponse } from "next/server";
import { getNotifications } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet parameter required" }, { status: 400 });
  }

  const notifications = await getNotifications(wallet);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}

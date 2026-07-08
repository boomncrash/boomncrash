import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const preferences = await unsubscribeByToken(token);
  if (!preferences) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }

  return NextResponse.json({ unsubscribed: true, email: preferences.email });
}

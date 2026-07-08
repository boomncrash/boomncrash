import { NextRequest, NextResponse } from "next/server";
import { verifyEmailByToken } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const preferences = await verifyEmailByToken(token);
  if (!preferences) {
    return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
  }

  return NextResponse.json({ preferences, verified: true });
}

import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const updated = await markNotificationRead(id);

  if (!updated) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({ notification: updated });
}

import { NextRequest, NextResponse } from "next/server";
import { getRallyContributions } from "@/lib/repository";

interface RouteParams {
  params: Promise<{ bountyId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { bountyId } = await params;
  const contributions = await getRallyContributions(bountyId);
  return NextResponse.json({ contributions });
}

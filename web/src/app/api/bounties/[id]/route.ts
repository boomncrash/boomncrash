import { NextRequest, NextResponse } from "next/server";
import { getBountyById, updateBounty } from "@/lib/repository";
import { isAdminRequest, adminUnauthorizedResponse } from "@/lib/admin-auth";
import {
  hasOnlyPublicFields,
  sanitizeAdminBountyPatch,
  sanitizePublicBountyPatch,
} from "@/lib/bounty-status";
import { notifyBountyOpen } from "@/lib/notifications";
import { notifyCategorySubscribers } from "@/lib/category-notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const bounty = await getBountyById(id);

  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  return NextResponse.json({ bounty });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const current = await getBountyById(id);

  if (!current) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  const isAdmin = isAdminRequest(request);
  let patch;

  if (isAdmin && body.status !== undefined) {
    const result = sanitizeAdminBountyPatch(body, current);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    patch = result;
  } else if (hasOnlyPublicFields(body)) {
    patch = sanitizePublicBountyPatch(body, current);
  } else if (isAdmin) {
    patch = sanitizePublicBountyPatch(body, current);
    const adminResult = sanitizeAdminBountyPatch(body, current);
    if ("error" in adminResult) {
      return NextResponse.json({ error: adminResult.error }, { status: 400 });
    }
    patch = { ...patch, ...adminResult };
  } else {
    return adminUnauthorizedResponse();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ bounty: current });
  }

  const updated = await updateBounty(id, patch);

  if (patch.status === "open" && current.status !== "open") {
    await notifyBountyOpen(current.creatorAddress, current.id, current.title);
    void notifyCategorySubscribers({ ...current, ...patch, status: "open" });
  }

  return NextResponse.json({ bounty: updated });
}

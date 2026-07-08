import type { Bounty, BountyStatus } from "@/lib/types";

const ADMIN_STATUS_TRANSITIONS: Partial<Record<BountyStatus, BountyStatus[]>> = {
  pending_moderation: ["open", "rejected"],
  open: ["cancelled", "expired"],
  funding: ["cancelled"],
};

const PUBLIC_PATCH_FIELDS = new Set(["escrowAddress", "txHash"]);

export function canTransitionStatus(from: BountyStatus, to: BountyStatus): boolean {
  const allowed = ADMIN_STATUS_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function sanitizePublicBountyPatch(
  body: Record<string, unknown>,
  current: Bounty
): Partial<Bounty> {
  const patch: Partial<Bounty> = {};

  if (typeof body.escrowAddress === "string" && !current.escrowAddress) {
    patch.escrowAddress = body.escrowAddress;
  }
  if (typeof body.txHash === "string" && !current.txHash) {
    patch.txHash = body.txHash;
  }

  return patch;
}

export function sanitizeAdminBountyPatch(
  body: Record<string, unknown>,
  current: Bounty
): Partial<Bounty> | { error: string } {
  const patch: Partial<Bounty> = {};

  if (body.status !== undefined) {
    const next = body.status as BountyStatus;
    if (next === current.status) {
      return patch;
    }
    if (!canTransitionStatus(current.status, next)) {
      return {
        error: `Cannot transition bounty from ${current.status} to ${next}`,
      };
    }
    patch.status = next;
  }

  return patch;
}

export function hasOnlyPublicFields(body: Record<string, unknown>): boolean {
  return Object.keys(body).every((key) => PUBLIC_PATCH_FIELDS.has(key));
}

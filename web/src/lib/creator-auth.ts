import { NextRequest } from "next/server";
import type { Bounty, ChainId } from "@/lib/types";
import { getSessionFromRequest } from "@/lib/auth/session";

export function addressesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
  chain: ChainId
): boolean {
  if (!a || !b) return false;
  if (chain === "solana") return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export function getCreatorAddressHeader(request: NextRequest): string | null {
  return request.headers.get("x-creator-address");
}

export function isCreatorOfBounty(
  request: NextRequest,
  bounty: Bounty | undefined
): boolean {
  if (!bounty) return false;
  const creatorAddress = getCreatorAddressHeader(request);
  return addressesMatch(creatorAddress, bounty.creatorAddress, bounty.chain);
}

export async function isCreatorOfBountyAsync(
  request: NextRequest,
  bounty: Bounty | undefined
): Promise<boolean> {
  if (!bounty) return false;
  if (isCreatorOfBounty(request, bounty)) return true;

  const session = await getSessionFromRequest(request);
  if (!session) return false;

  return session.wallets.some(
    (w) =>
      w.chain === bounty.chain &&
      addressesMatch(w.address, bounty.creatorAddress, bounty.chain)
  );
}

export function creatorUnauthorizedResponse() {
  return Response.json({ error: "Creator authorization required" }, { status: 401 });
}

import type { NextRequest } from "next/server";
import type { ChainId } from "@/lib/types";
import {
  getAccountAddresses,
  getPrimaryWallet,
  getSessionFromRequest,
  type SessionPayload,
} from "@/lib/auth/session";
import { addressesMatch } from "@/lib/creator-auth";

export async function requireSession(request: NextRequest): Promise<SessionPayload | null> {
  return getSessionFromRequest(request);
}

export async function getSessionWalletForChain(
  request: NextRequest,
  chain: ChainId
): Promise<string | null> {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  if (chain === "base" || chain === "solana") {
    return getPrimaryWallet(session, chain)?.address ?? null;
  }
  return getPrimaryWallet(session, "base")?.address ?? null;
}

export function sessionOwnsAddress(session: SessionPayload, address: string, chain: ChainId): boolean {
  return session.wallets.some((w) => addressesMatch(w.address, address, chain));
}

export function sessionOwnsAnyAddress(session: SessionPayload, address: string, chain: ChainId): boolean {
  return sessionOwnsAddress(session, address, chain);
}

export function unauthorizedResponse(message = "Sign in required") {
  return Response.json({ error: message }, { status: 401 });
}

export async function isCreatorViaSession(
  request: NextRequest,
  creatorAddress: string,
  chain: ChainId
): Promise<boolean> {
  const session = await getSessionFromRequest(request);
  if (!session) return false;
  return session.wallets.some((w) => w.chain === chain && addressesMatch(w.address, creatorAddress, chain));
}

export function getSessionAddresses(session: SessionPayload): string[] {
  return getAccountAddresses(session);
}

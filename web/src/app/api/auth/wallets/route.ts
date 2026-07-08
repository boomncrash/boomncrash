import { NextRequest } from "next/server";
import {
  addEmbeddedWallet,
  linkExternalWallet,
  setPrimaryWallet,
  getAccountById,
  accountToSession,
} from "@/lib/auth/accounts";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { requireSession, unauthorizedResponse } from "@/lib/auth/request-auth";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();
  return Response.json({ wallets: session.wallets });
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = (await request.json()) as {
      action?: "generate" | "link" | "setPrimary";
      chain?: "base" | "solana";
      address?: string;
      label?: string;
      walletId?: string;
    };

    if (body.action === "generate") {
      if (!body.chain) return Response.json({ error: "Chain required" }, { status: 400 });
      await addEmbeddedWallet(session.accountId, body.chain, body.label);
    } else if (body.action === "link") {
      if (!body.chain || !body.address) {
        return Response.json({ error: "Chain and address required" }, { status: 400 });
      }
      await linkExternalWallet(session.accountId, body.chain, body.address.trim(), body.label);
    } else if (body.action === "setPrimary") {
      if (!body.walletId) return Response.json({ error: "walletId required" }, { status: 400 });
      await setPrimaryWallet(session.accountId, body.walletId);
    } else {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const account = await getAccountById(session.accountId);
    if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

    const updated = accountToSession(account);
    const token = await createSessionToken(updated);
    await setSessionCookie(token);

    return Response.json({ user: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet update failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

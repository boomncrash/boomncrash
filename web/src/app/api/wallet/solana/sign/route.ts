import { NextRequest } from "next/server";
import { Transaction } from "@solana/web3.js";
import { getPrimaryWalletPrivateKey } from "@/lib/auth/accounts";
import { requireSession, unauthorizedResponse } from "@/lib/auth/request-auth";
import { solanaKeypairFromStoredKey } from "@/lib/auth/wallet-vault";

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = (await request.json()) as { transaction?: string };
    if (!body.transaction) {
      return Response.json({ error: "Missing transaction" }, { status: 400 });
    }

    const wallet = await getPrimaryWalletPrivateKey(session.accountId, "solana");
    const tx = Transaction.from(Buffer.from(body.transaction, "base64"));
    const keypair = solanaKeypairFromStoredKey(wallet.privateKey);

    if (!tx.feePayer?.equals(keypair.publicKey)) {
      return Response.json({ error: "Transaction fee payer must match your primary Solana wallet" }, { status: 403 });
    }

    tx.partialSign(keypair);
    return Response.json({
      signedTransaction: Buffer.from(tx.serialize()).toString("base64"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sign transaction";
    return Response.json({ error: message }, { status: 500 });
  }
}

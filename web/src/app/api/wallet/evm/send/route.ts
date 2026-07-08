import { NextRequest } from "next/server";
import {
  createWalletClient,
  http,
  type Address,
  type Hash,
  type TransactionRequest,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getPrimaryWalletPrivateKey } from "@/lib/auth/accounts";
import { requireSession, unauthorizedResponse } from "@/lib/auth/request-auth";
import { getBaseViemChain } from "@/lib/wallet-ethereum";
import { getActiveChain } from "@/lib/chain-config";

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = (await request.json()) as { transaction?: TransactionRequest };
    const tx = body.transaction;
    if (!tx) return Response.json({ error: "Missing transaction" }, { status: 400 });

    const from = tx.from as Address | undefined;
    const wallet = await getPrimaryWalletPrivateKey(session.accountId, "base");

    if (from && from.toLowerCase() !== wallet.address.toLowerCase()) {
      return Response.json(
        { error: "Transaction sender must match your primary Base wallet" },
        { status: 403 }
      );
    }

    const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
    const chain = getBaseViemChain();
    const rpcUrl = getActiveChain("base").rpcUrl;
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    const hash = await walletClient.sendTransaction({
      account,
      chain,
      to: tx.to as Address | undefined,
      data: tx.data as `0x${string}` | undefined,
      value: tx.value ? BigInt(tx.value.toString()) : undefined,
      gas: tx.gas ? BigInt(tx.gas.toString()) : undefined,
      maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas.toString()) : undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas
        ? BigInt(tx.maxPriorityFeePerGas.toString())
        : undefined,
    });

    return Response.json({ hash: hash as Hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send transaction";
    return Response.json({ error: message }, { status: 500 });
  }
}

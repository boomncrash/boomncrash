import { createPublicClient, createWalletClient, custom, http, type Address, type Hash } from "viem";
import { getActiveChain } from "@/lib/chain-config";
import { getBaseViemChain } from "@/lib/wallet-ethereum";

export function createRpcPublicClient() {
  const chain = getBaseViemChain();
  const rpcUrl = getActiveChain("base").rpcUrl;
  return createPublicClient({ chain, transport: http(rpcUrl) });
}

export function createEmbeddedWalletClient(account: Address) {
  const chain = getBaseViemChain();

  return createWalletClient({
    account,
    chain,
    transport: custom({
      async request({ method, params }) {
        if (method === "eth_accounts" || method === "eth_requestAccounts") {
          return [account];
        }
        if (method === "eth_chainId") {
          return `0x${chain.id.toString(16)}`;
        }
        if (method === "eth_sendTransaction") {
          const res = await fetch("/api/wallet/evm/send", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction: params?.[0] }),
          });
          const data = (await res.json()) as { hash?: Hash; error?: string };
          if (!res.ok) throw new Error(data.error ?? "Transaction failed");
          return data.hash;
        }

        const rpcUrl = getActiveChain("base").rpcUrl;
        const rpcRes = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        });
        const json = (await rpcRes.json()) as { result?: unknown; error?: { message: string } };
        if (json.error) throw new Error(json.error.message);
        return json.result;
      },
    }),
  });
}

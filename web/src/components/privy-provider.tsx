"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { base, baseSepolia } from "viem/chains";
import type { ReactNode } from "react";
import { isBaseMainnet, isSolanaMainnet } from "@/lib/chain-config";

const baseChain = isBaseMainnet() ? base : baseSepolia;
const solanaCluster = isSolanaMainnet() ? "solana:mainnet" : "solana:devnet";
const solanaRpc = isSolanaMainnet()
  ? "https://api.mainnet-beta.solana.com"
  : "https://api.devnet.solana.com";
const solanaWs = isSolanaMainnet()
  ? "wss://api.mainnet-beta.solana.com"
  : "wss://api.devnet.solana.com";

export function BoomPrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "dark",
          accentColor: "#10b981",
          walletChainType: "ethereum-and-solana",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
          solana: { createOnLogin: "all-users" },
        },
        supportedChains: [baseChain],
        defaultChain: baseChain,
        solana: {
          rpcs: {
            [solanaCluster]: {
              rpc: createSolanaRpc(solanaRpc),
              rpcSubscriptions: createSolanaRpcSubscriptions(solanaWs),
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

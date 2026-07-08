import type { Chain, ChainId } from "@/lib/types";
import { CHAINS } from "@/lib/constants";

const BASE_MAINNET = {
  network: "base",
  chainId: 8453,
  rpcUrl: "https://mainnet.base.org",
  explorerUrl: "https://basescan.org",
  usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

const SOLANA_MAINNET = {
  network: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  explorerUrl: "https://explorer.solana.com",
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

export function isBaseMainnet(): boolean {
  return process.env.NEXT_PUBLIC_BASE_NETWORK === "mainnet";
}

export function isSolanaMainnet(): boolean {
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet";
}

export function getActiveChain(chainId: ChainId): Chain {
  const base = CHAINS[chainId];
  if (chainId === "base" && isBaseMainnet()) {
    return {
      ...base,
      name: "Base",
      network: BASE_MAINNET.network,
      chainId: BASE_MAINNET.chainId,
      rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC ?? BASE_MAINNET.rpcUrl,
      explorerUrl: BASE_MAINNET.explorerUrl,
      usdcAddress:
        process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS ?? BASE_MAINNET.usdcAddress,
    };
  }

  if (chainId === "solana" && isSolanaMainnet()) {
    return {
      ...base,
      name: "Solana",
      network: SOLANA_MAINNET.network,
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC ?? SOLANA_MAINNET.rpcUrl,
      explorerUrl: SOLANA_MAINNET.explorerUrl,
      usdcMint:
        process.env.NEXT_PUBLIC_SOLANA_USDC_MINT ?? SOLANA_MAINNET.usdcMint,
    };
  }

  if (chainId === "base") {
    return {
      ...base,
      rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC ?? base.rpcUrl,
      usdcAddress: process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS ?? base.usdcAddress,
    };
  }

  if (chainId === "solana") {
    return {
      ...base,
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC ?? base.rpcUrl,
      usdcMint: process.env.NEXT_PUBLIC_SOLANA_USDC_MINT ?? base.usdcMint,
    };
  }

  return base;
}

export function getSolanaExplorerUrl(path: string): string {
  const chain = getActiveChain("solana");
  const cluster = isSolanaMainnet() ? "" : "?cluster=devnet";
  return `${chain.explorerUrl}${path}${cluster}`;
}

export function getNetworkLabel(): string {
  const base = isBaseMainnet() ? "Base Mainnet" : "Base Sepolia";
  const sol = isSolanaMainnet() ? "Solana Mainnet" : "Solana Devnet";
  return `${base} · ${sol}`;
}

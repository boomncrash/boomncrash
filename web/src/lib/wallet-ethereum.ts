import { base, baseSepolia } from "viem/chains";
import { getActiveChain, isBaseMainnet } from "@/lib/chain-config";

export function getBaseViemChain() {
  return isBaseMainnet() ? base : baseSepolia;
}

export function getExpectedBaseChainId(): number {
  return getActiveChain("base").chainId ?? baseSepolia.id;
}

export function getBaseNetworkLabel(): string {
  return isBaseMainnet() ? "Base Mainnet" : "Base Sepolia";
}

export function getAddChainParams() {
  const active = getActiveChain("base");
  const chain = getBaseViemChain();
  return {
    chainId: `0x${chain.id.toString(16)}`,
    chainName: getBaseNetworkLabel(),
    nativeCurrency: active.nativeCurrency,
    rpcUrls: [active.rpcUrl],
    blockExplorerUrls: [active.explorerUrl],
  };
}

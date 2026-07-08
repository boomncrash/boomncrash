import type { Address } from "viem";
import type { ConnectedWallet } from "@privy-io/react-auth";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";

let activeBaseAddress: Address | null = null;
let activeSolanaAddress: string | null = null;
let privyEvmWallet: ConnectedWallet | null = null;
let privyEthereumProvider: Awaited<ReturnType<ConnectedWallet["getEthereumProvider"]>> | null =
  null;
let privySolanaWallet: ConnectedStandardSolanaWallet | null = null;

export function setActiveBaseAddress(address: Address | null) {
  activeBaseAddress = address;
}

export function getActiveBaseAddress(): Address | null {
  return activeBaseAddress;
}

export function setActiveSolanaAddress(address: string | null) {
  activeSolanaAddress = address;
}

export function getActiveSolanaAddress(): string | null {
  return activeSolanaAddress;
}

export function setPrivyEvmWallet(wallet: ConnectedWallet | null) {
  privyEvmWallet = wallet;
}

export function getPrivyEvmWallet(): ConnectedWallet | null {
  return privyEvmWallet;
}

export function setPrivyEthereumProvider(
  provider: Awaited<ReturnType<ConnectedWallet["getEthereumProvider"]>> | null
) {
  privyEthereumProvider = provider;
}

export function getPrivyEthereumProvider() {
  if (!privyEthereumProvider) {
    throw new Error("Sign in to use your Base wallet.");
  }
  return privyEthereumProvider;
}

export function setPrivySolanaWallet(wallet: ConnectedStandardSolanaWallet | null) {
  privySolanaWallet = wallet;
}

export function getPrivySolanaWallet(): ConnectedStandardSolanaWallet | null {
  return privySolanaWallet;
}

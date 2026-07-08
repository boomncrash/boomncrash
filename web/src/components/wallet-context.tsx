"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { baseSepolia } from "viem/chains";

const BASE_SEPOLIA_CHAIN_ID = baseSepolia.id;
const BASE_SEPOLIA_HEX = `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}`;

interface WalletContextValue {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isBaseSepolia: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToBaseSepolia: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

async function fetchChainId(): Promise<number | null> {
  if (!window.ethereum) return null;
  try {
    const id = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    return parseInt(id, 16);
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshChain = useCallback(async () => {
    setChainId(await fetchChainId());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list[0]) setAddress(list[0]);
      })
      .catch(() => {});

    refreshChain();

    const handleAccountsChanged = (accounts: string[]) => {
      setAddress(accounts[0] ?? null);
    };

    const handleChainChanged = () => {
      refreshChain();
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refreshChain]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Install MetaMask or another Web3 wallet to connect.");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setAddress(accounts[0] ?? null);
      await refreshChain();
    } finally {
      setIsConnecting(false);
    }
  }, [refreshChain]);

  const switchToBaseSepolia = useCallback(async () => {
    if (!window.ethereum) throw new Error("No wallet found");

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA_HEX }],
      });
    } catch (err: unknown) {
      const error = err as { code?: number };
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BASE_SEPOLIA_HEX,
              chainName: "Base Sepolia",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            },
          ],
        });
      } else {
        throw err;
      }
    }
    await refreshChain();
  }, [refreshChain]);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected: !!address,
        isConnecting,
        isBaseSepolia: chainId === BASE_SEPOLIA_CHAIN_ID,
        connect,
        disconnect,
        switchToBaseSepolia,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: string[][]) => void) => void;
      removeListener?: (event: string, handler: (...args: string[][]) => void) => void;
    };
  }
}

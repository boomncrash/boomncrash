"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getActiveChain } from "@/lib/chain-config";

interface SolanaWalletContextValue {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  connection: Connection;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

const SolanaWalletContext = createContext<SolanaWalletContextValue | null>(null);

function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  const provider = window.solana;
  if (provider?.isPhantom) return provider;
  return null;
}

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const solanaChain = getActiveChain("solana");
  const rpcUrl = solanaChain.rpcUrl;
  const connection = useMemo(() => new Connection(rpcUrl, "confirmed"), [rpcUrl]);

  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider) return;

    provider.connect({ onlyIfTrusted: true }).then(
      (resp: { publicKey: PublicKey }) => setPublicKey(resp.publicKey.toBase58()),
      () => {}
    );

    const handleAccountChanged = (key: PublicKey | null) => {
      setPublicKey(key?.toBase58() ?? null);
    };

    provider.on?.("accountChanged", handleAccountChanged);
    return () => {
      provider.removeListener?.("accountChanged", handleAccountChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = getPhantomProvider();
    if (!provider) {
      window.open("https://phantom.app/", "_blank");
      throw new Error("Install Phantom wallet to connect on Solana.");
    }
    setIsConnecting(true);
    try {
      const resp = await provider.connect();
      setPublicKey(resp.publicKey.toBase58());
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getPhantomProvider();
    await provider?.disconnect?.();
    setPublicKey(null);
  }, []);

  const signTransaction = useCallback(async (tx: Transaction) => {
    const provider = getPhantomProvider();
    if (!provider?.signTransaction) {
      throw new Error("Phantom signTransaction not available");
    }
    return provider.signTransaction(tx);
  }, []);

  return (
    <SolanaWalletContext.Provider
      value={{
        publicKey,
        isConnected: !!publicKey,
        isConnecting,
        connect,
        disconnect,
        connection,
        signTransaction,
      }}
    >
      {children}
    </SolanaWalletContext.Provider>
  );
}

export function useSolanaWallet() {
  const ctx = useContext(SolanaWalletContext);
  if (!ctx) throw new Error("useSolanaWallet must be used within SolanaWalletProvider");
  return ctx;
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signTransaction: (tx: Transaction) => Promise<Transaction>;
      on?: (event: string, handler: (key: PublicKey | null) => void) => void;
      removeListener?: (event: string, handler: (key: PublicKey | null) => void) => void;
    };
  }
}

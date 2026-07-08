"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { Connection, Transaction } from "@solana/web3.js";
import { useSignTransaction as usePrivySignSolanaTransaction } from "@privy-io/react-auth/solana";
import { getActiveChain, isSolanaMainnet } from "@/lib/chain-config";
import { useAuth } from "@/components/auth-context";
import { getPrivySolanaWallet } from "@/lib/auth/active-wallet";

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

const noopSolanaWallet: SolanaWalletContextValue = {
  publicKey: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  connection: new Connection(getActiveChain("solana").rpcUrl, "confirmed"),
  signTransaction: async () => {
    throw new Error("Sign in to use your Solana wallet.");
  },
};

export function NoopSolanaWalletProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    primarySolanaAddress,
    login,
    logout,
  } = useAuth();

  const solanaChain = getActiveChain("solana");
  const connection = useMemo(
    () => new Connection(solanaChain.rpcUrl, "confirmed"),
    [solanaChain.rpcUrl]
  );

  const connect = useCallback(async () => {
    await login();
  }, [login]);

  const disconnect = useCallback(() => {
    void logout();
  }, [logout]);

  return (
    <SolanaWalletContext.Provider
      value={{
        publicKey: primarySolanaAddress,
        isConnected: isAuthenticated && !!primarySolanaAddress,
        isConnecting: isLoading,
        connect,
        disconnect,
        connection,
        signTransaction: noopSolanaWallet.signTransaction,
      }}
    >
      {children}
    </SolanaWalletContext.Provider>
  );
}

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    primarySolanaAddress,
    login,
    logout,
  } = useAuth();
  const { signTransaction: privySignTransaction } = usePrivySignSolanaTransaction();

  const solanaChain = getActiveChain("solana");
  const connection = useMemo(
    () => new Connection(solanaChain.rpcUrl, "confirmed"),
    [solanaChain.rpcUrl]
  );

  const solanaChainId = isSolanaMainnet() ? "solana:mainnet" : "solana:devnet";

  const signTransaction = useCallback(
    async (tx: Transaction) => {
      const wallet = getPrivySolanaWallet();
      if (!wallet) throw new Error("Sign in to use your Solana wallet.");

      const serialized = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const { signedTransaction } = await privySignTransaction({
        transaction: serialized,
        wallet,
        chain: solanaChainId,
      });

      return Transaction.from(signedTransaction);
    },
    [privySignTransaction, solanaChainId]
  );

  const connect = useCallback(async () => {
    await login();
  }, [login]);

  const disconnect = useCallback(() => {
    void logout();
  }, [logout]);

  return (
    <SolanaWalletContext.Provider
      value={{
        publicKey: primarySolanaAddress,
        isConnected: isAuthenticated && !!primarySolanaAddress,
        isConnecting: isLoading,
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
  return ctx ?? noopSolanaWallet;
}

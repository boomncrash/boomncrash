"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth-context";
import { getExpectedBaseChainId } from "@/lib/wallet-ethereum";

interface WalletContextValue {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isOnBaseNetwork: boolean;
  isBaseSepolia: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToBaseNetwork: () => Promise<void>;
  switchToBaseSepolia: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    primaryBaseAddress,
    login,
    logout,
  } = useAuth();

  const connect = useCallback(async () => {
    await login();
  }, [login]);

  const disconnect = useCallback(() => {
    void logout();
  }, [logout]);

  const noopSwitch = useCallback(async () => {}, []);

  return (
    <WalletContext.Provider
      value={{
        address: primaryBaseAddress,
        chainId: isAuthenticated ? getExpectedBaseChainId() : null,
        isConnected: isAuthenticated && !!primaryBaseAddress,
        isConnecting: isLoading,
        isOnBaseNetwork: isAuthenticated,
        isBaseSepolia: isAuthenticated,
        connect,
        disconnect,
        switchToBaseNetwork: noopSwitch,
        switchToBaseSepolia: noopSwitch,
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

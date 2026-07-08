"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface AccountWalletView {
  id: string;
  chain: "base" | "solana";
  address: string;
  isPrimary: boolean;
  label?: string | null;
  hasPrivateKey: boolean;
}

export interface AuthContextValue {
  user: { email: string; accountId: string; wallets: AccountWalletView[] } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  signup: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  primaryBaseAddress: string | null;
  primarySolanaAddress: string | null;
  wallets: AccountWalletView[];
  generateWallet: (chain: "base" | "solana") => Promise<void>;
  linkWallet: (chain: "base" | "solana", address: string) => Promise<void>;
  setPrimaryWallet: (walletId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const noopAuth: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {
    alert("Configure NEXT_PUBLIC_PRIVY_APP_ID to enable login.");
  },
  signup: async () => {
    alert("Configure NEXT_PUBLIC_PRIVY_APP_ID to enable signup.");
  },
  logout: async () => {},
  refreshSession: async () => {},
  primaryBaseAddress: null,
  primarySolanaAddress: null,
  wallets: [],
  generateWallet: async () => {},
  linkWallet: async () => {},
  setPrimaryWallet: async () => {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={noopAuth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? noopAuth;
}

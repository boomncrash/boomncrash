"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { usePrivy, useWallets, useCreateWallet, type ConnectedWallet } from "@privy-io/react-auth";
import {
  useWallets as useSolanaWallets,
  useCreateWallet as useCreateSolanaWallet,
  type ConnectedStandardSolanaWallet,
} from "@privy-io/react-auth/solana";
import type { Address } from "viem";
import {
  AuthContext,
  type AccountWalletView,
} from "@/components/auth-context";
import {
  setActiveBaseAddress,
  setActiveSolanaAddress,
  setPrivyEvmWallet,
  setPrivyEthereumProvider,
  setPrivySolanaWallet,
} from "@/lib/auth/active-wallet";

function pickEmbeddedEvmWallet(wallets: ConnectedWallet[]): ConnectedWallet | null {
  return wallets.find((w) => w.walletClientType === "privy") ?? wallets[0] ?? null;
}

function pickEmbeddedSolanaWallet(
  wallets: ConnectedStandardSolanaWallet[]
): ConnectedStandardSolanaWallet | null {
  return wallets[0] ?? null;
}

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets: evmWallets, ready: evmReady } = useWallets();
  const { wallets: solanaWallets, ready: solanaReady } = useSolanaWallets();
  const { createWallet: createEvmWallet } = useCreateWallet();
  const { createWallet: createSolWallet } = useCreateSolanaWallet();

  const primaryEvm = useMemo(() => pickEmbeddedEvmWallet(evmWallets), [evmWallets]);
  const primarySol = useMemo(() => pickEmbeddedSolanaWallet(solanaWallets), [solanaWallets]);

  const walletViews = useMemo((): AccountWalletView[] => {
    const list: AccountWalletView[] = [];
    evmWallets.forEach((w) => {
      list.push({
        id: `evm-${w.address}`,
        chain: "base",
        address: w.address,
        isPrimary: primaryEvm?.address === w.address,
        label: w.walletClientType === "privy" ? "Embedded Base" : "Linked Base",
        hasPrivateKey: w.walletClientType === "privy",
      });
    });
    solanaWallets.forEach((w) => {
      list.push({
        id: `sol-${w.address}`,
        chain: "solana",
        address: w.address,
        isPrimary: primarySol?.address === w.address,
        label: "Embedded Solana",
        hasPrivateKey: true,
      });
    });
    return list;
  }, [evmWallets, solanaWallets, primaryEvm, primarySol]);

  useEffect(() => {
    if (!primaryEvm) {
      setActiveBaseAddress(null);
      setPrivyEvmWallet(null);
      setPrivyEthereumProvider(null);
      return;
    }
    setActiveBaseAddress(primaryEvm.address as Address);
    setPrivyEvmWallet(primaryEvm);
    void primaryEvm.getEthereumProvider().then(setPrivyEthereumProvider);
  }, [primaryEvm]);

  useEffect(() => {
    setActiveSolanaAddress(primarySol?.address ?? null);
    setPrivySolanaWallet(primarySol);
  }, [primarySol]);

  const sessionUser = useMemo(() => {
    if (!authenticated || !user?.email?.address) return null;
    return {
      email: user.email.address,
      accountId: user.id,
      wallets: walletViews,
    };
  }, [authenticated, user, walletViews]);

  const loginFn = useCallback(async () => {
    login();
  }, [login]);

  const generateWallet = useCallback(
    async (chain: "base" | "solana") => {
      if (chain === "base") await createEvmWallet({ createAdditional: true });
      else await createSolWallet({ createAdditional: true });
    },
    [createEvmWallet, createSolWallet]
  );

  return (
    <AuthContext.Provider
      value={{
        user: sessionUser,
        isLoading: !ready || !evmReady || !solanaReady,
        isAuthenticated: authenticated,
        login: loginFn,
        signup: loginFn,
        logout: async () => {
          await logout();
        },
        refreshSession: async () => {},
        primaryBaseAddress: primaryEvm?.address ?? null,
        primarySolanaAddress: primarySol?.address ?? null,
        wallets: walletViews,
        generateWallet,
        linkWallet: async () => {
          throw new Error("Link external wallets from the Privy account menu.");
        },
        setPrimaryWallet: async () => {
          throw new Error("Switch active wallet from the Privy account menu.");
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthFromPrivy() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within PrivyAuthProvider");
  return ctx;
}

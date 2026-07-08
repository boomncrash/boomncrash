"use client";

import type { ReactNode } from "react";
import { BoomPrivyProvider } from "@/components/privy-provider";
import { PrivyAuthProvider } from "@/components/privy-auth-provider";
import { AuthProvider } from "@/components/auth-context";
import { ReferralCapture } from "@/components/referral-capture";
import { ReferralClaim } from "@/components/referral-claim";
import { WalletProvider } from "@/components/wallet-context";
import { SolanaWalletProvider } from "@/components/solana-wallet-context";

export default function ClientProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <>
        <div className="bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
          Set <code className="text-amber-100">NEXT_PUBLIC_PRIVY_APP_ID</code> to enable email login and wallets.
        </div>
        <AuthProvider>{children}</AuthProvider>
      </>
    );
  }

  return (
    <BoomPrivyProvider>
      <PrivyAuthProvider>
        <WalletProvider>
          <SolanaWalletProvider>
            <ReferralCapture />
            <ReferralClaim />
            {children}
          </SolanaWalletProvider>
        </WalletProvider>
      </PrivyAuthProvider>
    </BoomPrivyProvider>
  );
}

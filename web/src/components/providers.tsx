"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ReferralCapture } from "@/components/referral-capture";
import { ReferralClaim } from "@/components/referral-claim";
import { WalletProvider } from "@/components/wallet-context";
import { SolanaWalletProvider } from "@/components/solana-wallet-context";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <SolanaWalletProvider>
          <ReferralCapture />
          <ReferralClaim />
          {children}
        </SolanaWalletProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

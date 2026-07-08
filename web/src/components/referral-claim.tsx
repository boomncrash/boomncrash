"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import { getStoredReferral, clearStoredReferral } from "@/lib/referral";

function walletsMatch(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export function ReferralClaim() {
  const { address } = useWallet();
  const { publicKey } = useSolanaWallet();
  const claimedRef = useRef(new Set<string>());

  useEffect(() => {
    const wallet = address ?? publicKey;
    if (!wallet) return;

    const claimKey = wallet.length <= 42 ? wallet.toLowerCase() : wallet;
    if (claimedRef.current.has(claimKey)) return;

    const referrer = getStoredReferral();
    if (!referrer || walletsMatch(referrer, wallet)) return;

    claimedRef.current.add(claimKey);

    fetch("/api/referrals/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wallet-address": wallet,
      },
      body: JSON.stringify({ refereeAddress: wallet, referrerAddress: referrer }),
    })
      .then((res) => {
        if (res.ok) clearStoredReferral();
      })
      .catch(() => {});
  }, [address, publicKey]);

  return null;
}

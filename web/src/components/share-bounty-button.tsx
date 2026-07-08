"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import { APP_NAME } from "@/lib/constants";
import { appendReferralToUrl } from "@/lib/referral";

interface ShareBountyButtonProps {
  bountyId: string;
  title: string;
}

export function ShareBountyButton({ bountyId, title }: ShareBountyButtonProps) {
  const { address } = useWallet();
  const { publicKey } = useSolanaWallet();
  const [copied, setCopied] = useState(false);

  const referrer = address ?? publicKey;

  const buildShareUrl = () => {
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}/bounty/${bountyId}`
        : `/bounty/${bountyId}`;
    return appendReferralToUrl(base, referrer);
  };

  const share = async () => {
    const shareUrl = buildShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Check out this bounty on ${APP_NAME}`, url: shareUrl });
        return;
      } catch {
        // user cancelled or unsupported
      }
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-zinc-300 transition hover:border-emerald-500/30 hover:text-white"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-400" /> Link copied
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" /> Share bounty
        </>
      )}
    </button>
  );
}

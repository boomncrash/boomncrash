"use client";

import { useEffect, useState } from "react";
import { Link2, Check, Users } from "lucide-react";
import { referralLinkFor } from "@/lib/referral";
import { truncateAddress } from "@/lib/utils";
import type { ReferralStats } from "@/lib/types";

interface ReferralPanelProps {
  walletAddress: string;
}

export function ReferralPanel({ walletAddress }: ReferralPanelProps) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const link = referralLinkFor(walletAddress);

  useEffect(() => {
    fetch(`/api/referrals?wallet=${encodeURIComponent(walletAddress)}`, {
      headers: { "x-wallet-address": walletAddress },
    })
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, [walletAddress]);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-violet-400" />
        <h2 className="font-semibold">Referral link</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Share Bountly with your link. Referrals are tracked when new users connect a wallet via
        your URL.
      </p>

      {stats && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <Users className="h-4 w-4 text-violet-400" />
            {stats.referralCount} referral{stats.referralCount === 1 ? "" : "s"}
          </span>
          {stats.referredBy && (
            <span className="text-zinc-500">
              Referred by {truncateAddress(stats.referredBy)}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono text-zinc-400"
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-300"
        >
          {copied ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-4 w-4" /> Copied
            </span>
          ) : (
            "Copy link"
          )}
        </button>
      </div>
    </div>
  );
}

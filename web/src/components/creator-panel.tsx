"use client";

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import {
  approveBasePayout,
  isEscrowConfigured,
} from "@/lib/contracts/base-escrow";
import {
  approveSolanaPayout,
  isSolanaEscrowConfigured,
} from "@/lib/contracts/solana-escrow";
import { truncateAddress } from "@/lib/utils";
import type { Bounty, Submission } from "@/lib/types";
import type { Address } from "viem";

interface CreatorPanelProps {
  bounty: Bounty;
  submissions: Submission[];
}

function creatorHeaders(creatorAddress: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-creator-address": creatorAddress,
  };
}

export function CreatorPanel({ bounty, submissions }: CreatorPanelProps) {
  const { address, isConnected, isOnBaseNetwork, switchToBaseNetwork } = useWallet();
  const { publicKey, isConnected: isSolanaConnected, connection, signTransaction } =
    useSolanaWallet();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isBaseCreator =
    bounty.chain === "base" &&
    isConnected &&
    address &&
    bounty.creatorAddress.toLowerCase() === address.toLowerCase();

  const isSolanaCreator =
    bounty.chain === "solana" &&
    isSolanaConnected &&
    publicKey &&
    bounty.creatorAddress === publicKey;

  const creatorAddress = isBaseCreator ? address! : isSolanaCreator ? publicKey! : null;

  const payableSubmissions = submissions.filter((s) => s.status === "approved");

  const canPayBase =
    isBaseCreator && !!bounty.escrowAddress && isEscrowConfigured();
  const canPaySolana =
    isSolanaCreator && !!bounty.escrowAddress && isSolanaEscrowConfigured();

  if ((!canPayBase && !canPaySolana) || payableSubmissions.length === 0) return null;

  const handleApprovePayout = async (submission: Submission) => {
    setError("");
    setSuccess("");
    setLoading(submission.id);

    try {
      let payoutTxHash: string;

      if (canPayBase) {
        if (!isOnBaseNetwork) await switchToBaseNetwork();
        payoutTxHash = await approveBasePayout({
          escrowAddress: bounty.escrowAddress as Address,
          hunterAddress: submission.hunterAddress as Address,
        });
      } else {
        payoutTxHash = await approveSolanaPayout({
          connection,
          creator: new PublicKey(publicKey!),
          signTransaction,
          bountyId: bounty.id,
          hunter: new PublicKey(submission.hunterAddress),
        });
      }

      await fetch(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: creatorHeaders(creatorAddress!),
        body: JSON.stringify({ status: "paid", payoutTxHash }),
      });

      setSuccess(`Paid ${truncateAddress(submission.hunterAddress)} — tx confirmed`);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-emerald-400" />
        <h2 className="font-semibold">Release USDC</h2>
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        Approved submissions ready for on-chain payout ({bounty.chain}).
      </p>

      <div className="mt-4 space-y-3">
        {payableSubmissions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-4"
          >
            <div>
              <p className="text-sm font-medium">{truncateAddress(sub.hunterAddress)}</p>
              <p className="mt-1 text-xs text-zinc-500 line-clamp-1">{sub.proofDescription}</p>
            </div>
            <button
              onClick={() => handleApprovePayout(sub)}
              disabled={!!loading}
              className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading === sub.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Paying...
                </>
              ) : (
                "Pay USDC"
              )}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}
    </section>
  );
}

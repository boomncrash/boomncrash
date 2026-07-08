"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import type { Address } from "viem";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import { truncateAddress } from "@/lib/utils";
import type { Bounty, Submission } from "@/lib/types";
import {
  submitBaseEscrow,
  getBaseEscrowStatus,
  isEscrowConfigured,
} from "@/lib/contracts/base-escrow";
import {
  submitSolanaEscrow,
  isSolanaEscrowConfigured,
} from "@/lib/contracts/solana-escrow";

interface CreatorReviewPanelProps {
  bounty: Bounty;
  submissions: Submission[];
}

function creatorHeaders(creatorAddress: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-creator-address": creatorAddress,
  };
}

async function syncOnChainSubmit(
  bounty: Bounty,
  submission: Submission,
  opts: {
    publicKey: string | null;
    connection: Connection;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
) {
  if (!bounty.escrowAddress) return;

  if (bounty.chain === "base" && isEscrowConfigured()) {
    const status = await getBaseEscrowStatus(bounty.escrowAddress as Address);
    if (status === 0) {
      await submitBaseEscrow({
        escrowAddress: bounty.escrowAddress as Address,
        hunterAddress: submission.hunterAddress as Address,
      });
    }
    return;
  }

  if (bounty.chain === "solana" && isSolanaEscrowConfigured() && opts.publicKey) {
    await submitSolanaEscrow({
      connection: opts.connection,
      creator: new PublicKey(opts.publicKey),
      signTransaction: opts.signTransaction,
      bountyId: bounty.id,
      hunter: new PublicKey(submission.hunterAddress),
    });
  }
}

export function CreatorReviewPanel({ bounty, submissions }: CreatorReviewPanelProps) {
  const { address, isConnected } = useWallet();
  const { publicKey, isConnected: isSolanaConnected, connection, signTransaction } =
    useSolanaWallet();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [localSubmissions, setLocalSubmissions] = useState(submissions);

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
  const pending = localSubmissions.filter((s) => s.status === "pending");

  if (!creatorAddress || pending.length === 0) return null;

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    setError("");
    setLoading(id);

    try {
      const submission = localSubmissions.find((s) => s.id === id);
      if (!submission) throw new Error("Submission not found");

      if (status === "approved" && bounty.escrowAddress) {
        try {
          await syncOnChainSubmit(bounty, submission, {
            publicKey,
            connection,
            signTransaction,
          });
        } catch (chainErr) {
          console.warn("On-chain submit skipped or failed:", chainErr);
        }
      }

      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: creatorHeaders(creatorAddress),
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");

      setLocalSubmissions((prev) =>
        prev.map((s) => (s.id === id ? data.submission : s))
      );

      if (status === "approved" && bounty.escrowAddress) {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
      <h2 className="font-semibold text-amber-200">Review Submissions</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Approve quality work before releasing USDC. On-chain escrows are marked Submitted on
        approval so disputes can freeze funds.
      </p>

      <div className="mt-4 space-y-3">
        {pending.map((sub) => (
          <div
            key={sub.id}
            className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{truncateAddress(sub.hunterAddress)}</p>
                <p className="mt-1 text-sm text-zinc-400">{sub.proofDescription}</p>
                <a
                  href={sub.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                >
                  View proof <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(sub.id, "approved")}
                  disabled={!!loading}
                  title="Approve"
                  className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  {loading === sub.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleReview(sub.id, "rejected")}
                  disabled={!!loading}
                  title="Reject"
                  className="rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

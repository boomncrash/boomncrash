"use client";

import { useState } from "react";
import { AlertTriangle, Link2 } from "lucide-react";
import type { Address } from "viem";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import type { Bounty, Submission, Dispute } from "@/lib/types";
import { canFileDispute, disputeWindowEndsAt } from "@/lib/disputes";
import {
  isEscrowConfigured,
  markBaseEscrowDisputed,
} from "@/lib/contracts/base-escrow";
import {
  isSolanaEscrowConfigured,
  markSolanaEscrowDisputed,
} from "@/lib/contracts/solana-escrow";
import { PublicKey } from "@solana/web3.js";

interface DisputePanelProps {
  bounty: Bounty;
  submission: Submission;
  existingDisputes: Dispute[];
}

function isCreator(bounty: Bounty, wallet: string | null): boolean {
  if (!wallet) return false;
  if (bounty.chain === "solana") return bounty.creatorAddress === wallet;
  return bounty.creatorAddress.toLowerCase() === wallet.toLowerCase();
}

export function DisputePanel({ bounty, submission, existingDisputes }: DisputePanelProps) {
  const { address } = useWallet();
  const { publicKey, connection, signTransaction } = useSolanaWallet();
  const wallet = address ?? publicKey;

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [onChainLoading, setOnChainLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onChainError, setOnChainError] = useState<string | null>(null);
  const [filed, setFiled] = useState(false);
  const [onChainDone, setOnChainDone] = useState(false);

  const openDispute = existingDisputes.find((d) => d.status === "open");
  const eligible = canFileDispute(bounty, submission, wallet) && !openDispute && !filed;
  const showOnChainBase =
    (filed || openDispute) &&
    bounty.chain === "base" &&
    bounty.escrowAddress &&
    isEscrowConfigured() &&
    isCreator(bounty, wallet);

  const showOnChainSolana =
    (filed || openDispute) &&
    bounty.chain === "solana" &&
    isSolanaEscrowConfigured() &&
    isCreator(bounty, wallet);

  if (bounty.status !== "approved" && bounty.status !== "disputed") return null;
  if (!submission || submission.status !== "approved") return null;

  const handleFile = async () => {
    if (!wallet || !reason.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": wallet,
        },
        body: JSON.stringify({
          bountyId: bounty.id,
          submissionId: submission.id,
          filerAddress: wallet,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to file dispute");

      setFiled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to file dispute");
    } finally {
      setLoading(false);
    }
  };

  const handleOnChainDispute = async () => {
    setOnChainLoading(true);
    setOnChainError(null);

    try {
      if (bounty.chain === "base") {
        if (!bounty.escrowAddress) return;
        await markBaseEscrowDisputed(bounty.escrowAddress as Address);
      } else if (bounty.chain === "solana") {
        if (!publicKey) throw new Error("Connect your Solana wallet");
        await markSolanaEscrowDisputed({
          connection,
          creator: new PublicKey(publicKey),
          signTransaction,
          bountyId: bounty.id,
        });
      }
      setOnChainDone(true);
    } catch (err) {
      setOnChainError(
        err instanceof Error
          ? err.message
          : "On-chain dispute failed. Escrow must be in Submitted status (creator only)."
      );
    } finally {
      setOnChainLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h2 className="font-semibold">Dispute window</h2>
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        Creators or hunters can file a dispute within 48 hours of approval, before payout
        finalizes. Window closes {disputeWindowEndsAt(submission).toLocaleString()}.
      </p>

      {openDispute && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-amber-300">Dispute under review</p>
          <p className="mt-1 text-zinc-400">{openDispute.reason}</p>
        </div>
      )}

      {eligible && (
        <div className="mt-4 space-y-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this approval should be disputed…"
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleFile}
            disabled={loading || !reason.trim()}
            className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 disabled:opacity-50"
          >
            {loading ? "Filing…" : "File dispute"}
          </button>
        </div>
      )}

      {filed && !openDispute && (
        <p className="mt-4 text-sm text-emerald-400">
          Dispute filed. An admin will review within the dispute window.
        </p>
      )}

      {showOnChainBase && !onChainDone && (
        <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-cyan-300">
            <Link2 className="h-4 w-4" />
            Base escrow freeze (optional)
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            As creator, call <code className="text-zinc-400">markDisputed</code> on the escrow
            contract while status is Submitted — blocks payout until resolved.
          </p>
          {onChainError && <p className="mt-2 text-sm text-red-400">{onChainError}</p>}
          <button
            onClick={handleOnChainDispute}
            disabled={onChainLoading}
            className="mt-3 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300 disabled:opacity-50"
          >
            {onChainLoading ? "Confirming…" : "Mark disputed on Base"}
          </button>
        </div>
      )}

      {showOnChainSolana && !onChainDone && (
        <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-violet-300">
            <Link2 className="h-4 w-4" />
            Solana escrow freeze (optional)
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            As creator, call <code className="text-zinc-400">mark_disputed</code> on the escrow
            PDA while status is Submitted — blocks payout until resolved.
          </p>
          {onChainError && <p className="mt-2 text-sm text-red-400">{onChainError}</p>}
          <button
            onClick={handleOnChainDispute}
            disabled={onChainLoading || !publicKey}
            className="mt-3 rounded-lg bg-violet-500/20 px-4 py-2 text-sm text-violet-300 disabled:opacity-50"
          >
            {onChainLoading ? "Confirming…" : "Mark disputed on Solana"}
          </button>
        </div>
      )}

      {onChainDone && (
        <p className="mt-4 text-sm text-emerald-400">
          Escrow marked disputed on {bounty.chain === "solana" ? "Solana" : "Base"}.
        </p>
      )}

      {!wallet && (
        <p className="mt-4 text-sm text-zinc-500">Connect your wallet to file a dispute.</p>
      )}
    </section>
  );
}

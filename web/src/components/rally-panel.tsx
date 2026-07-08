"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Zap } from "lucide-react";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import { RALLY_CREATOR_SEED_PERCENT } from "@/lib/constants";
import {
  formatUsdc,
  rallyProgressPercent,
  rallyRemaining,
  truncateAddress,
} from "@/lib/utils";
import {
  contributeBaseRally,
  isEscrowConfigured,
} from "@/lib/contracts/base-escrow";
import {
  contributeSolanaRally,
  isSolanaEscrowConfigured,
} from "@/lib/contracts/solana-escrow";
import { PublicKey } from "@solana/web3.js";
import type { Bounty, RallyContribution } from "@/lib/types";
import type { Address } from "viem";

interface RallyPanelProps {
  bounty: Bounty;
}

export function RallyPanel({ bounty }: RallyPanelProps) {
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contributions, setContributions] = useState<RallyContribution[]>([]);
  const [localBounty, setLocalBounty] = useState(bounty);

  const { address, isConnected, isBaseSepolia, switchToBaseSepolia } = useWallet();
  const {
    publicKey: solanaAddress,
    isConnected: isSolanaConnected,
    connection: solanaConnection,
    signTransaction: signSolanaTransaction,
  } = useSolanaWallet();

  const isSolana = bounty.chain === "solana";
  const backerAddress = isSolana ? solanaAddress : address;
  const backerConnected = isSolana ? isSolanaConnected : isConnected;

  const funded = localBounty.rallyFunded ?? 0;
  const progress = rallyProgressPercent(localBounty.rewardUsdc, funded);
  const remaining = rallyRemaining(localBounty.rewardUsdc, funded);
  const isFunding = localBounty.status === "funding";
  const onChainRally =
    bounty.chain === "base"
      ? isEscrowConfigured() && !!localBounty.escrowAddress
      : isSolanaEscrowConfigured() && !!localBounty.escrowAddress;

  useEffect(() => {
    fetch(`/api/rallies/${bounty.id}`)
      .then((r) => r.json())
      .then((data) => setContributions(data.contributions ?? []))
      .catch(() => {});
  }, [bounty.id, localBounty.rallyFunded]);

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!backerConnected || !backerAddress) {
      setError(isSolana ? "Connect Phantom to contribute." : "Connect your wallet to contribute.");
      return;
    }

    if (amount <= 0 || amount > remaining) {
      setError(`Enter between 1 and ${remaining} USDC.`);
      return;
    }

    setLoading(true);
    try {
      let txHash: string | undefined;

      if (onChainRally && !isSolana) {
        if (!isBaseSepolia) await switchToBaseSepolia();
        setSuccess("Confirm USDC contribution in your wallet...");
        txHash = await contributeBaseRally({
          bountyId: bounty.id,
          amountUsdc: amount,
          backer: backerAddress as Address,
        });
      }

      if (onChainRally && isSolana) {
        setSuccess("Confirm USDC contribution in Phantom...");
        txHash = await contributeSolanaRally({
          connection: solanaConnection,
          backer: new PublicKey(backerAddress!),
          signTransaction: signSolanaTransaction,
          bountyId: bounty.id,
          amountUsdc: amount,
        });
      }

      const res = await fetch(`/api/rallies/${bounty.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bountyId: bounty.id,
          backerAddress,
          amountUsdc: amount,
          chain: bounty.chain,
          txHash,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Contribution failed");

      setLocalBounty(data.bounty);
      setContributions((prev) => [data.contribution, ...prev]);
      setAmount(Math.min(10, rallyRemaining(data.bounty.rewardUsdc, data.bounty.rallyFunded)));
      setSuccess(
        data.bounty.status === "pending_moderation"
          ? "Rally fully funded! Bounty moves to review."
          : data.milestone === "50_percent"
            ? `Contributed ${formatUsdc(amount)}. Rally hit 50% — momentum building!`
            : `Contributed ${formatUsdc(amount)}. Rally is ${rallyProgressPercent(data.bounty.rewardUsdc, data.bounty.rallyFunded)}% funded.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!bounty.isRally) return null;

  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400" />
            <h2 className="font-semibold text-cyan-300">Rally</h2>
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
              Crowdfunded
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Creator seeded {RALLY_CREATOR_SEED_PERCENT}% ({formatUsdc(localBounty.creatorSeed ?? 0)}).
            Back the rest in USDC — bounty goes live when fully funded.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-cyan-400">{progress}%</p>
          <p className="text-xs text-zinc-500">funded</p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-400">
        <span>{formatUsdc(funded)} of {formatUsdc(localBounty.rewardUsdc)} raised</span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {localBounty.backerCount ?? 0} backers
        </span>
        {isFunding && remaining > 0 && (
          <span className="text-cyan-400">{formatUsdc(remaining)} to go</span>
        )}
      </div>

      {isFunding && (
        <form onSubmit={handleContribute} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Contribute (USDC)
            </label>
            <input
              type="number"
              min={1}
              max={remaining}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-300">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-300">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading || !backerConnected || remaining <= 0}
            className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Contributing...
              </span>
            ) : (
              `Back this Rally · ${formatUsdc(amount)}`
            )}
          </button>
          <p className="text-xs text-zinc-500">
            {onChainRally
              ? "USDC locks on-chain in the Rally escrow when factory is deployed."
              : "Contributions recorded off-chain until escrow contracts are deployed."}
          </p>
        </form>
      )}

      {!isFunding && localBounty.status === "pending_moderation" && (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Rally fully funded — awaiting moderation before hunters can submit.
        </p>
      )}

      {contributions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-zinc-300">Recent backers</h3>
          <ul className="mt-3 space-y-2">
            {contributions.slice(0, 5).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="text-zinc-400">{truncateAddress(c.backerAddress)}</span>
                <span className="text-cyan-400">{formatUsdc(c.amountUsdc)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

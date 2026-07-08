"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import { BOUNTY_CATEGORIES, CHAINS, PROHIBITED_KEYWORDS, RALLY_CREATOR_SEED_PERCENT } from "@/lib/constants";
import {
  createBaseEscrow,
  createBaseRally,
  isEscrowConfigured,
} from "@/lib/contracts/base-escrow";
import { isSolanaEscrowConfigured, createSolanaEscrow, createSolanaRally } from "@/lib/contracts/solana-escrow";
import { PublicKey } from "@solana/web3.js";
import { containsProhibitedContent, formatUsdc } from "@/lib/utils";
import type { BountyCategory, ChainId } from "@/lib/types";
import type { Address } from "viem";

type Step = "form" | "escrow" | "done";

export default function CreateBountyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    deliverables: "",
    category: "social" as BountyCategory,
    chain: "base" as ChainId,
    rewardUsdc: 25,
    deadline: "",
    isRally: false,
  });

  const { address, isConnected, isBaseSepolia, switchToBaseSepolia } = useWallet();
  const {
    publicKey: solanaAddress,
    isConnected: isSolanaConnected,
    connect: connectSolana,
    connection: solanaConnection,
    signTransaction: signSolanaTransaction,
  } = useSolanaWallet();
  const isSolana = form.chain === "solana";
  const creatorAddress = isSolana ? solanaAddress : address;
  const creatorConnected = isSolana ? isSolanaConnected : isConnected;

  const category = BOUNTY_CATEGORIES.find((c) => c.id === form.category);
  const needsBaseEscrow = form.chain === "base" && isEscrowConfigured() && !form.isRally;
  const needsBaseRally = form.chain === "base" && isEscrowConfigured() && form.isRally;
  const needsSolanaEscrow = form.chain === "solana" && isSolanaEscrowConfigured() && !form.isRally;
  const needsSolanaRally = form.chain === "solana" && isSolanaEscrowConfigured() && form.isRally;
  const needsOnChainBase = needsBaseEscrow || needsBaseRally;
  const creatorSeed = (form.rewardUsdc * RALLY_CREATOR_SEED_PERCENT) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatusMessage("");

    if (!creatorConnected || !creatorAddress) {
      setError(isSolana ? "Connect your Phantom wallet first." : "Connect your wallet first.");
      return;
    }

    const combined = `${form.title} ${form.description} ${form.deliverables}`;
    if (containsProhibitedContent(combined, PROHIBITED_KEYWORDS)) {
      setError("Your bounty contains prohibited content. Please revise.");
      return;
    }

    if (category && (form.rewardUsdc < category.minReward || form.rewardUsdc > category.maxReward)) {
      setError(`Reward must be between $${category.minReward} and $${category.maxReward} for ${category.label}.`);
      return;
    }

    if (needsOnChainBase && !isBaseSepolia) {
      try {
        setLoading(true);
        setStatusMessage("Switching to Base Sepolia...");
        await switchToBaseSepolia();
      } catch {
        setError("Please switch your wallet to Base Sepolia network.");
        setLoading(false);
        return;
      }
    }

    setLoading(true);

    try {
      // Step 1: Save bounty metadata
      setStatusMessage("Saving bounty...");
      const res = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          creatorAddress: creatorAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create bounty");

      const bountyId = data.bounty.id as string;

      // Step 2: On-chain escrow for Base
      if (needsBaseEscrow) {
        setStep("escrow");
        setStatusMessage("Approve USDC spend in your wallet...");
        const { escrowAddress, txHash } = await createBaseEscrow({
          bountyId,
          rewardUsdc: form.rewardUsdc,
          deadlineIso: new Date(form.deadline).toISOString(),
          creator: creatorAddress as Address,
        });

        setStatusMessage("Updating bounty with escrow details...");
        await fetch(`/api/bounties/${bountyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ escrowAddress, txHash }),
        });
      }

      if (needsBaseRally) {
        setStep("escrow");
        setStatusMessage("Approve USDC seed for Rally...");
        const { escrowAddress, txHash } = await createBaseRally({
          bountyId,
          targetUsdc: form.rewardUsdc,
          seedUsdc: creatorSeed,
          deadlineIso: new Date(form.deadline).toISOString(),
          creator: creatorAddress as Address,
        });

        setStatusMessage("Updating Rally with escrow details...");
        await fetch(`/api/bounties/${bountyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ escrowAddress, txHash }),
        });
      }

      if (needsSolanaEscrow) {
        setStep("escrow");
        setStatusMessage("Sign Solana escrow transaction in Phantom...");
        const { escrowAddress, txSignature } = await createSolanaEscrow({
          connection: solanaConnection,
          creator: new PublicKey(solanaAddress!),
          signTransaction: signSolanaTransaction,
          bountyId,
          rewardUsdc: form.rewardUsdc,
          deadlineIso: new Date(form.deadline).toISOString(),
        });

        await fetch(`/api/bounties/${bountyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ escrowAddress, txHash: txSignature }),
        });
      }

      if (needsSolanaRally) {
        setStep("escrow");
        setStatusMessage("Sign Solana Rally seed transaction in Phantom...");
        const { escrowAddress, txSignature } = await createSolanaRally({
          connection: solanaConnection,
          creator: new PublicKey(solanaAddress!),
          signTransaction: signSolanaTransaction,
          bountyId,
          targetUsdc: form.rewardUsdc,
          seedUsdc: creatorSeed,
          deadlineIso: new Date(form.deadline).toISOString(),
        });

        await fetch(`/api/bounties/${bountyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ escrowAddress, txHash: txSignature }),
        });
      }

      setStep("done");
      router.push(`/bounty/${bountyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Post a Bounty</h1>
      <p className="mt-2 text-zinc-400">
        Lock USDC in escrow. Hunters complete your task and get paid on approval.
      </p>

      {!creatorConnected && (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {isSolana ? (
            <>
              Connect Phantom for Solana bounties.{" "}
              <button type="button" onClick={() => connectSolana()} className="underline">
                Connect Phantom
              </button>
            </>
          ) : (
            "Connect your wallet to post a bounty."
          )}
        </div>
      )}

      {form.chain === "base" && !isEscrowConfigured() && (
        <div className="mt-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-200">
          Base escrow contracts not deployed yet — bounty will be saved off-chain for now.
          Deploy contracts and set <code className="text-emerald-400">NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS</code>.
        </div>
      )}

      {form.chain === "solana" && !isSolanaEscrowConfigured() && (
        <div className="mt-6 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-purple-200">
          Solana escrow program not deployed yet — bounty saved off-chain. Set{" "}
          <code className="text-emerald-400">NEXT_PUBLIC_SOLANA_PROGRAM_ID</code> after deploying the Anchor program.
        </div>
      )}

      {needsBaseEscrow && creatorConnected && !isSolana && !isBaseSepolia && (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Switch to <strong>Base Sepolia</strong> to lock USDC in escrow. We&apos;ll prompt you on submit.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
            placeholder="e.g. Quote tweet our launch announcement"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as BountyCategory })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              {BOUNTY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Chain</label>
            <select
              value={form.chain}
              onChange={(e) => setForm({ ...form, chain: e.target.value as ChainId })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              {Object.values(CHAINS)
                .filter((c) => !c.devOnly)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Description</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
            placeholder="Describe the task in detail..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Deliverables</label>
          <textarea
            required
            rows={3}
            value={form.deliverables}
            onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
            placeholder="What proof should hunters submit?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Reward (USDC)
              {category && (
                <span className="ml-1 text-zinc-500">
                  ${category.minReward}–${category.maxReward}
                </span>
              )}
            </label>
            <input
              required
              type="number"
              min={category?.minReward ?? 5}
              max={category?.maxReward ?? 2500}
              value={form.rewardUsdc}
              onChange={(e) => setForm({ ...form, rewardUsdc: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Deadline</label>
            <input
              required
              type="date"
              value={form.deadline}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.isRally}
              onChange={(e) => setForm({ ...form, isRally: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-cyan-300">Launch as a Rally</span>
              <p className="mt-1 text-sm text-zinc-400">
                You seed {RALLY_CREATOR_SEED_PERCENT}% ({formatUsdc(creatorSeed)} at current reward).
                The community backs the rest before the bounty goes live.
              </p>
            </div>
          </label>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-300">
              {form.isRally ? "Rally flow:" : "Escrow flow:"}
            </strong>{" "}
            {form.isRally
              ? `Your ${RALLY_CREATOR_SEED_PERCENT}% seed is recorded. Backers contribute until the pool hits ${formatUsdc(form.rewardUsdc)}, then the bounty opens for submissions.`
              : needsBaseEscrow
                ? "You'll approve USDC spend, then funds lock on-chain via BountyFactory."
                : needsSolanaEscrow
                  ? "You'll lock USDC via the Solana escrow program."
                  : `Funds will be escrowed on ${form.chain === "base" ? "Base" : "Solana"} when contracts are live.`}
            {" "}3% platform fee deducted on payout.
          </p>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !creatorConnected}
          className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? step === "escrow"
              ? "Locking USDC in escrow..."
              : "Creating..."
            : form.isRally
              ? "Launch Rally → Seed & Fund"
              : needsBaseEscrow
                ? "Create Bounty → Approve & Lock USDC"
                : "Create Bounty"}
        </button>
      </form>
    </div>
  );
}

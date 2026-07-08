"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import type { Bounty } from "@/lib/types";

export default function SubmitProofPage() {
  const { bountyId } = useParams<{ bountyId: string }>();
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const { publicKey, isConnected: isSolanaConnected, connect: connectSolana } = useSolanaWallet();
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ proofUrl: "", proofDescription: "" });

  const isSolana = bounty?.chain === "solana";
  const hunterAddress = isSolana ? publicKey : address;
  const hunterConnected = isSolana ? isSolanaConnected : isConnected;

  useEffect(() => {
    fetch(`/api/bounties/${bountyId}`)
      .then((r) => r.json())
      .then((data) => setBounty(data.bounty))
      .catch(() => setError("Bounty not found"));
  }, [bountyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hunterConnected || !hunterAddress) {
      setError(isSolana ? "Connect Phantom wallet first." : "Connect your wallet first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bountyId,
          hunterAddress,
          ...form,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");

      router.push(`/bounty/${bountyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!bounty && !error) {
    return <div className="py-20 text-center text-zinc-500">Loading...</div>;
  }

  if (!bounty) {
    return <div className="py-20 text-center text-red-400">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Submit Proof</h1>
      <p className="mt-2 text-zinc-400">For: {bounty.title}</p>

      {!hunterConnected && (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {isSolana ? (
            <>
              Connect Phantom to submit on Solana.{" "}
              <button type="button" onClick={() => connectSolana()} className="underline">
                Connect Phantom
              </button>
            </>
          ) : (
            "Connect your wallet to submit proof."
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Proof URL</label>
          <input
            required
            type="url"
            value={form.proofUrl}
            onChange={(e) => setForm({ ...form, proofUrl: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            placeholder="https://x.com/yourpost or IPFS link"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Description</label>
          <textarea
            required
            rows={4}
            value={form.proofDescription}
            onChange={(e) => setForm({ ...form, proofDescription: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            placeholder="Explain how you completed the task..."
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !hunterConnected}
          className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 font-medium text-black disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Proof"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import Link from "next/link";
import { ExternalLink, Check, X } from "lucide-react";
import { BountyCard } from "@/components/bounty-card";
import { EmailSettingsPanel } from "@/components/email-settings-panel";
import { CategorySubscriptionsPanel } from "@/components/category-subscriptions-panel";
import { ReferralPanel } from "@/components/referral-panel";
import type { Bounty, Submission } from "@/lib/types";
import { truncateAddress } from "@/lib/utils";

function creatorHeaders(creatorAddress: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-creator-address": creatorAddress,
  };
}

function ownsBounty(bounty: Bounty, baseAddress?: string | null, solanaAddress?: string | null) {
  if (bounty.chain === "solana" && solanaAddress) {
    return bounty.creatorAddress === solanaAddress;
  }
  if (baseAddress) {
    return bounty.creatorAddress.toLowerCase() === baseAddress.toLowerCase();
  }
  return false;
}

export default function DashboardPage() {
  const { address, isConnected } = useWallet();
  const { publicKey, isConnected: isSolanaConnected } = useSolanaWallet();
  const [created, setCreated] = useState<Bounty[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allBounties, setAllBounties] = useState<Bounty[]>([]);
  const [tab, setTab] = useState<"created" | "review" | "hunted">("created");
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);

  const walletConnected = isConnected || isSolanaConnected;
  const displayAddress = address ?? publicKey;

  useEffect(() => {
    if (!walletConnected) return;

    fetch("/api/bounties")
      .then((r) => r.json())
      .then((data) => {
        const all: Bounty[] = data.bounties ?? [];
        setAllBounties(all);
        setCreated(all.filter((b) => ownsBounty(b, address, publicKey)));
      });

    fetch("/api/submissions")
      .then((r) => r.json())
      .then((data) => {
        const all: Submission[] = data.submissions ?? [];
        setSubmissions(all);
      });
  }, [walletConnected, address, publicKey]);

  const hunted = useMemo(() => {
    const addrs = [address, publicKey].filter(Boolean) as string[];
    return submissions.filter((s) =>
      addrs.some((a) =>
        s.hunterAddress === a ||
        s.hunterAddress.toLowerCase() === a.toLowerCase()
      )
    );
  }, [submissions, address, publicKey]);

  const toReview = useMemo(() => {
    const myBountyIds = new Set(created.map((b) => b.id));
    return submissions.filter(
      (s) => s.status === "pending" && myBountyIds.has(s.bountyId)
    );
  }, [submissions, created]);

  const bountyTitle = (bountyId: string) =>
    allBounties.find((b) => b.id === bountyId)?.title ?? `Bounty ${bountyId.slice(0, 8)}`;

  const creatorAddressForBounty = (bountyId: string) => {
    const bounty = allBounties.find((b) => b.id === bountyId);
    if (!bounty) return null;
    if (bounty.chain === "solana" && publicKey && ownsBounty(bounty, address, publicKey)) {
      return publicKey;
    }
    if (address && ownsBounty(bounty, address, publicKey)) {
      return address;
    }
    return null;
  };

  const handleReview = async (submissionId: string, bountyId: string, status: "approved" | "rejected") => {
    const creatorAddress = creatorAddressForBounty(bountyId);
    if (!creatorAddress) return;

    setReviewLoading(submissionId);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: creatorHeaders(creatorAddress),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Review failed");
      }
      const data = await res.json();
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? data.submission : s))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Review failed");
    } finally {
      setReviewLoading(null);
    }
  };

  if (!walletConnected) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-4 text-zinc-400">
          Connect your Base or Solana wallet to view your bounties and submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-zinc-400">Wallet: {truncateAddress(displayAddress!)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <EmailSettingsPanel walletAddress={displayAddress!} />
        <CategorySubscriptionsPanel walletAddress={displayAddress!} />
        <ReferralPanel walletAddress={displayAddress!} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(["created", "review", "hunted"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t === "created" && `My Bounties (${created.length})`}
            {t === "review" && `To Review (${toReview.length})`}
            {t === "hunted" && `My Submissions (${hunted.length})`}
          </button>
        ))}
      </div>

      {tab === "created" && (
        <div className="mt-8">
          {created.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center">
              <p className="text-zinc-400">You haven&apos;t posted any bounties yet.</p>
              <Link href="/create" className="mt-4 inline-block text-emerald-400 hover:underline">
                Post your first bounty →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {created.map((b) => (
                <BountyCard key={b.id} bounty={b} displayCurrency="NGN" />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "review" && (
        <div className="mt-8 space-y-4">
          {toReview.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center">
              <p className="text-zinc-400">No submissions waiting for your review.</p>
            </div>
          ) : (
            toReview.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/bounty/${sub.bountyId}`}
                      className="font-medium hover:text-emerald-400"
                    >
                      {bountyTitle(sub.bountyId)}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-500">
                      Hunter: {truncateAddress(sub.hunterAddress)}
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">{sub.proofDescription}</p>
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
                      onClick={() => handleReview(sub.id, sub.bountyId, "approved")}
                      disabled={!!reviewLoading}
                      className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleReview(sub.id, sub.bountyId, "rejected")}
                      disabled={!!reviewLoading}
                      className="rounded-lg bg-red-500/20 p-2 text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "hunted" && (
        <div className="mt-8 space-y-4">
          {hunted.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center">
              <p className="text-zinc-400">No submissions yet.</p>
              <Link href="/explore" className="mt-4 inline-block text-emerald-400 hover:underline">
                Browse bounties →
              </Link>
            </div>
          ) : (
            hunted.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-white/10 p-5">
                <div className="flex items-center justify-between">
                  <Link href={`/bounty/${sub.bountyId}`} className="font-medium hover:text-emerald-400">
                    {bountyTitle(sub.bountyId)}
                  </Link>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
                    {sub.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{sub.proofDescription}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

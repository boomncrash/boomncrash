"use client";

import { useEffect, useState } from "react";
import { BountyCard } from "@/components/bounty-card";
import { BOUNTY_CATEGORIES, CHAINS } from "@/lib/constants";
import type { BountyListItem, ChainId, BountyCategory } from "@/lib/types";

type ViewMode = "open" | "rally" | "all";

export default function ExplorePage() {
  const [bounties, setBounties] = useState<BountyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chain, setChain] = useState<ChainId | "">("");
  const [category, setCategory] = useState<BountyCategory | "">("");
  const [view, setView] = useState<ViewMode>("open");

  useEffect(() => {
    const viewParam = new URLSearchParams(window.location.search).get("view");
    if (viewParam === "rally") setView("rally");
    else if (viewParam === "all") setView("all");
  }, []);
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "NGN" | "PHP">("NGN");

  useEffect(() => {
    const params = new URLSearchParams();
    if (chain) params.set("chain", chain);
    if (category) params.set("category", category);
    if (view === "open") params.set("status", "open");
    if (view === "rally") params.set("rally", "true");

    fetch(`/api/bounties?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setBounties(data.bounties ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [chain, category, view]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Explore Bounties</h1>
          <p className="mt-2 text-zinc-400">
            Browse global USDC bounties and live Rallies on Base and Solana
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as "USD" | "NGN" | "PHP")}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <option value="USD">USD</option>
            <option value="NGN">NGN</option>
            <option value="PHP">PHP</option>
          </select>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ViewMode)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <option value="open">Open bounties</option>
            <option value="rally">Rallies</option>
            <option value="all">All</option>
          </select>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as ChainId | "")}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <option value="">All chains</option>
            {Object.values(CHAINS)
              .filter((c) => !c.devOnly)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BountyCategory | "")}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {BOUNTY_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-12 text-center text-zinc-500">Loading bounties...</div>
      ) : bounties.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-zinc-400">No bounties match your filters.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bounties.map((bounty) => (
            <BountyCard
              key={bounty.id}
              bounty={bounty}
              displayCurrency={displayCurrency}
            />
          ))}
        </div>
      )}
    </div>
  );
}

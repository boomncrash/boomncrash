"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { BOUNTY_CATEGORIES } from "@/lib/constants";
import type { BountyCategory } from "@/lib/types";

interface CategorySubscriptionsPanelProps {
  walletAddress: string;
}

export function CategorySubscriptionsPanel({ walletAddress }: CategorySubscriptionsPanelProps) {
  const [selected, setSelected] = useState<Set<BountyCategory>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/settings/categories?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((data) => {
        setSelected(new Set((data.categories ?? []) as BountyCategory[]));
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const toggle = (category: BountyCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/settings/categories", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          walletAddress,
          categories: [...selected],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 p-6 text-sm text-zinc-500">
        Loading category subscriptions…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-cyan-400" />
        <h2 className="font-semibold">Category alerts</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Get notified when new bounties go live in categories you follow.
      </p>

      <div className="mt-4 space-y-3">
        {BOUNTY_CATEGORIES.map((cat) => (
          <label
            key={cat.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 transition hover:border-cyan-500/30"
          >
            <input
              type="checkbox"
              checked={selected.has(cat.id)}
              onChange={() => toggle(cat.id)}
              className="mt-1 rounded border-white/20"
            />
            <span>
              <span className="font-medium">{cat.label}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{cat.description}</span>
            </span>
          </label>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save subscriptions"}
      </button>
    </div>
  );
}

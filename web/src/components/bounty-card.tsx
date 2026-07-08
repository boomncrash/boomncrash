import Link from "next/link";
import { ArrowRight, Clock, Users, Zap, Award } from "lucide-react";
import { BadgeRow } from "@/components/badge-row";
import type { Bounty, BountyListItem } from "@/lib/types";
import { CHAINS, BOUNTY_CATEGORIES } from "@/lib/constants";
import { cn, formatUsdc, usdcToLocal, daysUntil, rallyProgressPercent } from "@/lib/utils";

interface BountyCardProps {
  bounty: Bounty | BountyListItem;
  displayCurrency?: "USD" | "NGN" | "PHP";
}

export function BountyCard({ bounty, displayCurrency = "USD" }: BountyCardProps) {
  const chain = CHAINS[bounty.chain];
  const category = BOUNTY_CATEGORIES.find((c) => c.id === bounty.category);
  const isRally = bounty.isRally;
  const rallyProgress = isRally
    ? rallyProgressPercent(bounty.rewardUsdc, bounty.rallyFunded ?? 0)
    : 0;
  const creatorBadges = "creatorBadges" in bounty ? bounty.creatorBadges : undefined;
  const creatorTier = "creatorTier" in bounty ? bounty.creatorTier : undefined;

  return (
    <Link
      href={`/bounty/${bounty.id}`}
      className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-500/30 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
          >
            {chain.name}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
            {category?.label}
          </span>
          {isRally && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs text-cyan-300">
              <Zap className="h-3 w-3" /> Rally
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-emerald-400">
            {formatUsdc(bounty.rewardUsdc)}
          </p>
          {displayCurrency !== "USD" && (
            <p className="text-xs text-zinc-500">
              ≈ {usdcToLocal(bounty.rewardUsdc, displayCurrency)}
            </p>
          )}
        </div>
      </div>

      <h3 className="mt-4 text-base font-medium text-white group-hover:text-emerald-300">
        {bounty.title}
      </h3>
      {creatorBadges && creatorBadges.length > 0 && (
        <div className="mt-2">
          <BadgeRow badges={creatorBadges} size="sm" showTooltips />
        </div>
      )}
      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{bounty.description}</p>

      {isRally && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>{rallyProgress}% funded</span>
            <span>{bounty.backerCount ?? 0} backers</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
              style={{ width: `${rallyProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {daysUntil(bounty.deadline)}d left
        </span>
        {!isRally && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {bounty.submissionCount ?? 0} submissions
          </span>
        )}
        {creatorTier && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: `${creatorTier.color}20`, color: creatorTier.color }}
            title="Creator reputation"
          >
            <Award className="h-3 w-3" />
            {creatorTier.label}
          </span>
        )}
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 capitalize",
            bounty.status === "open" && "bg-emerald-500/20 text-emerald-400",
            bounty.status === "funding" && "bg-cyan-500/20 text-cyan-400",
            bounty.status !== "open" && bounty.status !== "funding" && "bg-white/10 text-zinc-400"
          )}
        >
          {bounty.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1 text-sm text-emerald-400 opacity-0 transition group-hover:opacity-100">
        {isRally && bounty.status === "funding" ? "Back this Rally" : "View bounty"}{" "}
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

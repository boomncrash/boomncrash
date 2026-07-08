import Link from "next/link";
import { Award, Target } from "lucide-react";
import { BadgeRow } from "@/components/badge-row";
import {
  getHunterProfile,
  getSubmissions,
  getRallyContributionsByBacker,
} from "@/lib/repository";
import { computeBadges } from "@/lib/badges";
import { reputationTier } from "@/lib/profile";
import { formatUsdc, truncateAddress } from "@/lib/utils";

interface CreatorProfileCardProps {
  creatorAddress: string;
}

export async function CreatorProfileCard({ creatorAddress }: CreatorProfileCardProps) {
  const [profile, allSubmissions, rallyContribs] = await Promise.all([
    getHunterProfile(creatorAddress),
    getSubmissions(),
    getRallyContributionsByBacker(creatorAddress),
  ]);

  const tier = reputationTier(profile.reputationScore);
  const badges = computeBadges(profile, allSubmissions, rallyContribs);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-sm font-medium text-zinc-500">Bounty creator</h2>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/profile/${encodeURIComponent(creatorAddress)}`}
            className="font-mono text-sm hover:text-emerald-400"
          >
            {truncateAddress(creatorAddress)}
          </Link>
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
          >
            <Award className="h-3.5 w-3.5" />
            {tier.label}
          </span>
          {badges.length > 0 && (
            <div className="mt-3">
              <BadgeRow badges={badges.slice(0, 4)} size="sm" showTooltips />
            </div>
          )}
        </div>
        <div className="flex gap-6 text-center text-sm">
          <div>
            <p className="text-lg font-semibold text-emerald-400">{profile.reputationScore}</p>
            <p className="text-xs text-zinc-500">reputation</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-lg font-semibold">
              <Target className="h-4 w-4 text-zinc-500" />
              {profile.bountiesCreated}
            </p>
            <p className="text-xs text-zinc-500">posted</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{formatUsdc(profile.totalEarnedUsdc)}</p>
            <p className="text-xs text-zinc-500">earned</p>
          </div>
        </div>
      </div>
    </section>
  );
}

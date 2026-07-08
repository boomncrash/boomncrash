import Link from "next/link";
import type { Metadata } from "next";
import { Trophy, Medal } from "lucide-react";
import { BadgeRow } from "@/components/badge-row";
import { getLeaderboard, getSubmissions, getAllRallyContributions } from "@/lib/repository";
import { reputationTier } from "@/lib/profile";
import { computeBadges } from "@/lib/badges";
import { JsonLd, leaderboardJsonLd } from "@/lib/json-ld";
import { APP_NAME } from "@/lib/constants";
import { formatUsdc, truncateAddress, usdcToLocal } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Leaderboard — ${APP_NAME}`,
  description: "Top hunters ranked by reputation on Bountly. Complete USDC bounties and climb the ranks.",
  openGraph: {
    title: `Leaderboard | ${APP_NAME}`,
    description: "Top hunters ranked by reputation on the global USDC bounty marketplace.",
    type: "website",
  },
};

function addressesEqual(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export default async function LeaderboardPage() {
  const [leaders, allSubmissions, allContributions] = await Promise.all([
    getLeaderboard(50),
    getSubmissions(),
    getAllRallyContributions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={leaderboardJsonLd(leaders, reputationTier)} />
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20">
          <Trophy className="h-7 w-7 text-amber-400" />
        </div>
        <h1 className="mt-4 text-3xl font-bold">Leaderboard</h1>
        <p className="mt-2 text-zinc-400">
          Top hunters ranked by reputation — earn badges, complete bounties, climb the ranks.
        </p>
      </div>

      {leaders.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-zinc-400">No hunters on the board yet. Be the first to complete a bounty.</p>
          <Link href="/explore" className="mt-4 inline-block text-emerald-400 hover:underline">
            Browse bounties →
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-3">
          {leaders.map((profile, index) => {
            const tier = reputationTier(profile.reputationScore);
            const rank = index + 1;
            const backerContribs = allContributions.filter((c) =>
              addressesEqual(c.backerAddress, profile.address)
            );
            const badges = computeBadges(profile, allSubmissions, backerContribs);

            return (
              <Link
                key={profile.address}
                href={`/profile/${encodeURIComponent(profile.address)}`}
                className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-emerald-500/30 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg font-bold">
                    {rank <= 3 ? (
                      <Medal
                        className="h-5 w-5"
                        style={{
                          color: rank === 1 ? "#f59e0b" : rank === 2 ? "#a1a1aa" : "#cd7f32",
                        }}
                      />
                    ) : (
                      <span className="text-sm text-zinc-500">#{rank}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm">{truncateAddress(profile.address)}</p>
                    <span
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs"
                      style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                    >
                      {tier.label}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-400">{profile.reputationScore}</p>
                    <p className="text-xs text-zinc-500">rep</p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium">{formatUsdc(profile.totalEarnedUsdc)}</p>
                    <p className="text-xs text-zinc-500">
                      {profile.completedBounties} completed · ≈{" "}
                      {usdcToLocal(profile.totalEarnedUsdc, "NGN")}
                    </p>
                  </div>
                </div>
                {badges.length > 0 && (
                  <div className="mt-3 pl-14">
                    <BadgeRow badges={badges.slice(0, 4)} size="sm" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

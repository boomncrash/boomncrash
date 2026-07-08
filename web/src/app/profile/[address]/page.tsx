import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Award, Target, TrendingUp, Wallet } from "lucide-react";
import { BountyCard } from "@/components/bounty-card";
import {
  getHunterProfile,
  getBounties,
  getSubmissions,
  getRallyContributionsByBacker,
} from "@/lib/repository";
import { reputationTier } from "@/lib/profile";
import { computeBadges } from "@/lib/badges";
import { BadgeRow } from "@/components/badge-row";
import { JsonLd, hunterProfileJsonLd } from "@/lib/json-ld";
import { APP_NAME } from "@/lib/constants";
import { formatUsdc, truncateAddress, usdcToLocal } from "@/lib/utils";

interface PageProps {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { address } = await params;
  const decoded = decodeURIComponent(address);
  const profile = await getHunterProfile(decoded);

  if (!profile) {
    return { title: `Profile not found — ${APP_NAME}` };
  }

  const tier = reputationTier(profile.reputationScore);
  const title = `${truncateAddress(decoded)} — ${tier.label} Hunter`;
  const description = `${profile.completedBounties} bounties completed · ${formatUsdc(profile.totalEarnedUsdc)} USDC earned on ${APP_NAME}.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${APP_NAME}`,
      description,
      type: "profile",
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);

  const profile = await getHunterProfile(decoded);
  if (!profile) notFound();

  const tier = reputationTier(profile.reputationScore);
  const allSubmissions = await getSubmissions();
  const allBounties = await getBounties();
  const rallyContribs = await getRallyContributionsByBacker(decoded);
  const badges = computeBadges(profile, allSubmissions, rallyContribs);

  const recentSubmissions = allSubmissions
    .filter(
      (s) =>
        s.hunterAddress === decoded ||
        s.hunterAddress.toLowerCase() === decoded.toLowerCase()
    )
    .slice(0, 5);

  const recentBounties = allBounties
    .filter(
      (b) =>
        b.creatorAddress === decoded ||
        b.creatorAddress.toLowerCase() === decoded.toLowerCase()
    )
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={hunterProfileJsonLd(profile, tier.label)} />
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-zinc-500">{truncateAddress(decoded)}</p>
            <h1 className="mt-2 text-2xl font-bold">Hunter Profile</h1>
            <span
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
            >
              <Award className="h-3.5 w-3.5" />
              {tier.label}
            </span>
            {badges.length > 0 && (
              <div className="mt-4">
                <BadgeRow badges={badges} />
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-400">{profile.reputationScore}</p>
            <p className="text-sm text-zinc-500">reputation score</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Target, label: "Completed", value: String(profile.completedBounties) },
            {
              icon: Wallet,
              label: "Total earned",
              value: formatUsdc(profile.totalEarnedUsdc),
              sub: `≈ ${usdcToLocal(profile.totalEarnedUsdc, "NGN")}`,
            },
            {
              icon: TrendingUp,
              label: "Approval rate",
              value: `${profile.approvalRate}%`,
            },
            { icon: Award, label: "Bounties posted", value: String(profile.bountiesCreated) },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <Icon className="h-4 w-4 text-zinc-500" />
              <p className="mt-2 text-lg font-semibold">{value}</p>
              {sub && <p className="text-xs text-zinc-500">{sub}</p>}
              <p className="mt-1 text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {recentBounties.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Bounties created</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {recentBounties.map((b) => (
              <BountyCard key={b.id} bounty={b} displayCurrency="NGN" />
            ))}
          </div>
        </section>
      )}

      {recentSubmissions.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recent submissions</h2>
          <div className="mt-4 space-y-3">
            {recentSubmissions.map((sub) => (
              <Link
                key={sub.id}
                href={`/bounty/${sub.bountyId}`}
                className="block rounded-xl border border-white/10 p-4 transition hover:border-emerald-500/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {allBounties.find((b) => b.id === sub.bountyId)?.title ??
                      `Bounty ${sub.bountyId.slice(0, 8)}`}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
                    {sub.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-400 line-clamp-1">{sub.proofDescription}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-zinc-600">
        Member since {new Date(profile.memberSince).toLocaleDateString()}
        {profile.rallyBacked > 0 && ` · ${profile.rallyBacked} Rallies backed`}
      </p>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Shield, Globe, Zap, Coins, Trophy } from "lucide-react";
import { BountyCard } from "@/components/bounty-card";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getBounties, getLeaderboard } from "@/lib/repository";
import { enrichBountiesWithCreatorBadges } from "@/lib/bounty-enrichment";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/json-ld";
import { reputationTier } from "@/lib/profile";
import { truncateAddress } from "@/lib/utils";
import { getNetworkLabel } from "@/lib/chain-config";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Global USDC bounty marketplace on Base and Solana. Post tasks, complete bounties, and get paid in stablecoin. Nigeria-first, worldwide hunters.",
  openGraph: {
    title: `${APP_NAME} | ${APP_TAGLINE}`,
    description:
      "Fund tasks. Get paid in USDC. Escrow bounties on Base and Solana with instant payouts and crowdfunded Rallies.",
    type: "website",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_TAGLINE,
  },
};

export default async function HomePage() {
  const openBounties = await getBounties({ status: "open" });
  const featuredBounties = (await enrichBountiesWithCreatorBadges(openBounties)).slice(0, 3);
  const rallyBounties = (await getBounties({ rally: true })).filter(
    (b) => b.status === "funding"
  );
  const featuredRallyList = rallyBounties.length
    ? await enrichBountiesWithCreatorBadges([rallyBounties[0]])
    : [];
  const featuredRally = featuredRallyList[0];
  const topHunters = await getLeaderboard(3);

  return (
    <div>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.15)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
            <Globe className="h-4 w-4" />
            Global · USDC · {getNetworkLabel()}
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            {APP_NAME}
          </h1>
          <p className="mt-4 text-xl text-zinc-400 md:text-2xl">{APP_TAGLINE}</p>
          <p className="mx-auto mt-6 max-w-2xl text-zinc-500">
            Post bounties, fund tasks with USDC escrow, and pay hunters worldwide.
            Earn stable money completing social, content, and product testing tasks.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-medium text-black transition hover:opacity-90"
            >
              Explore Bounties <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3 font-medium transition hover:bg-white/5"
            >
              Post a Bounty
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-white/10 bg-white/[0.02] px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "USDC Escrow",
              desc: "Funds locked on-chain until task approved. No payment disputes.",
            },
            {
              icon: Zap,
              title: "Instant Payouts",
              desc: "Approved hunters receive USDC directly to their wallet.",
            },
            {
              icon: Coins,
              title: "Buy with Local Currency",
              desc: "Fund your wallet with NGN, USD, EUR, PHP and more via on-ramp.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold md:text-3xl">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { step: "1", title: "Post or browse", desc: "Creators lock USDC in escrow. Hunters browse global bounties." },
              { step: "2", title: "Complete & submit", desc: "Do the task, upload proof, and wait for review." },
              { step: "3", title: "Get paid in USDC", desc: "Approved submissions trigger instant USDC payout (minus 3% fee)." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-lg font-bold text-black">
                  {step}
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured bounties */}
      <section className="border-t border-white/10 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Featured Bounties</h2>
            <Link href="/explore" className="text-sm text-emerald-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {featuredBounties.map((bounty) => (
              <BountyCard key={bounty.id} bounty={bounty} displayCurrency="NGN" />
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard teaser */}
      {topHunters.length > 0 && (
        <section className="border-t border-white/10 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="text-2xl font-bold">Top Hunters</h2>
              </div>
              <Link href="/leaderboard" className="text-sm text-emerald-400 hover:underline">
                Full leaderboard →
              </Link>
            </div>
            <div className="mt-6 space-y-2">
              {topHunters.map((profile, i) => {
                const tier = reputationTier(profile.reputationScore);
                return (
                  <Link
                    key={profile.address}
                    href={`/profile/${encodeURIComponent(profile.address)}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition hover:border-emerald-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-zinc-500">#{i + 1}</span>
                      <span className="font-mono text-sm">{truncateAddress(profile.address)}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                      >
                        {tier.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">
                      {profile.reputationScore} rep
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Rally */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-sm font-medium uppercase tracking-wider text-cyan-400">
                Rally
              </span>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Crowdfunded Bounties</h2>
              <p className="mt-4 max-w-lg text-zinc-400">
                Seed 20% of a bounty and let the community fund the rest. Turn hype into
                measurable USDC funding.
              </p>
              <Link
                href="/explore?view=rally"
                className="mt-6 inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline"
              >
                Browse live Rallies <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {featuredRally && (
              <div className="w-full md:max-w-sm">
                <BountyCard bounty={featuredRally} displayCurrency="NGN" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

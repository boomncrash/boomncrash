import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { CreatorPanel } from "@/components/creator-panel";
import { CreatorReviewPanel } from "@/components/creator-review-panel";
import { CreatorProfileCard } from "@/components/creator-profile-card";
import { DisputePanel } from "@/components/dispute-panel";
import { HunterRepBadge } from "@/components/hunter-rep-badge";
import { RallyPanel } from "@/components/rally-panel";
import { ShareBountyButton } from "@/components/share-bounty-button";
import { getBountyById, getSubmissions, getDisputesByBounty } from "@/lib/repository";
import { CHAINS, BOUNTY_CATEGORIES, BOUNTY_STATUSES, APP_NAME } from "@/lib/constants";
import { approvedSubmission } from "@/lib/disputes";
import { buildHunterRepMap, lookupHunterRep } from "@/lib/hunter-rep";
import { JsonLd, bountyJobPostingJsonLd, bountyOfferJsonLd } from "@/lib/json-ld";
import { formatUsdc, usdcToLocal, daysUntil, calculatePayout } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const bounty = await getBountyById(id);

  if (!bounty) {
    return { title: `Bounty not found — ${APP_NAME}` };
  }

  const description = bounty.description.slice(0, 155).trim();
  const title = `${bounty.title} — ${formatUsdc(bounty.rewardUsdc)} USDC`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const ogImage = `${appUrl}/bounty/${bounty.id}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title: `${bounty.title} | ${APP_NAME}`,
      description,
      type: "website",
      url: `${appUrl}/bounty/${bounty.id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: bounty.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: bounty.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BountyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const bounty = await getBountyById(id);

  if (!bounty) notFound();

  const chain = CHAINS[bounty.chain];
  const category = BOUNTY_CATEGORIES.find((c) => c.id === bounty.category);
  const { fee, hunterPayout } = calculatePayout(bounty.rewardUsdc);
  const submissions = await getSubmissions(bounty.id);
  const disputes = await getDisputesByBounty(bounty.id);
  const approvedSub = approvedSubmission(bounty, submissions);
  const hunterRepMap = await buildHunterRepMap(submissions.map((s) => s.hunterAddress));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={[bountyJobPostingJsonLd(bounty), bountyOfferJsonLd(bounty)]} />
      <Link
        href="/explore"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to explore
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
          >
            {chain.name}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
            {category?.label}
          </span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
            {BOUNTY_STATUSES[bounty.status]}
          </span>
          {bounty.isRally && (
            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs text-cyan-300">
              Rally
            </span>
          )}
          {bounty.escrowAddress && (
            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs text-cyan-400">
              On-chain escrow
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-emerald-400">{formatUsdc(bounty.rewardUsdc)}</p>
          <p className="text-sm text-zinc-500">≈ {usdcToLocal(bounty.rewardUsdc, "NGN")}</p>
        </div>
      </div>

      <h1 className="mt-6 text-3xl font-bold">{bounty.title}</h1>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-400">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {daysUntil(bounty.deadline)} days left
        </span>
        <span>{submissions.length} submissions</span>
      </div>

      <div className="mt-6">
        <CreatorProfileCard creatorAddress={bounty.creatorAddress} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {bounty.isRally && <RallyPanel bounty={bounty} />}
          {approvedSub && (
            <DisputePanel
              bounty={bounty}
              submission={approvedSub}
              existingDisputes={disputes}
            />
          )}
          <CreatorReviewPanel bounty={bounty} submissions={submissions} />
          <CreatorPanel bounty={bounty} submissions={submissions} />

          <section className="rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-3 text-zinc-400 whitespace-pre-wrap">{bounty.description}</p>
          </section>

          <section className="rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold">Deliverables</h2>
            <p className="mt-3 text-zinc-400 whitespace-pre-wrap">{bounty.deliverables}</p>
          </section>

          {submissions.length > 0 && (
            <section className="rounded-2xl border border-white/10 p-6">
              <h2 className="font-semibold">Submissions ({submissions.length})</h2>
              <div className="mt-4 space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <HunterRepBadge
                        hunterAddress={sub.hunterAddress}
                        rep={lookupHunterRep(hunterRepMap, sub.hunterAddress)}
                      />
                      <span className="shrink-0 text-xs capitalize text-zinc-500">{sub.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{sub.proofDescription}</p>
                    <a
                      href={sub.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                    >
                      View proof <ExternalLink className="h-3 w-3" />
                    </a>
                    {sub.payoutTxHash && (
                      <a
                        href={`${chain.explorerUrl}/tx/${sub.payoutTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-xs text-zinc-500 hover:text-emerald-400"
                      >
                        Payout tx: {sub.payoutTxHash.slice(0, 10)}...
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold">Payout breakdown</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Hunter receives</dt>
                <dd className="text-emerald-400">{formatUsdc(hunterPayout)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Platform fee (3%)</dt>
                <dd>{formatUsdc(fee)}</dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 font-medium">
                <dt>Total escrow</dt>
                <dd>{formatUsdc(bounty.rewardUsdc)}</dd>
              </div>
            </dl>
          </div>

          <ShareBountyButton bountyId={bounty.id} title={bounty.title} />

          {bounty.status === "open" && (
            <Link
              href={`/submit/${bounty.id}`}
              className="block w-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-center font-medium text-black transition hover:opacity-90"
            >
              Submit Proof
            </Link>
          )}

          {bounty.escrowAddress && (
            <a
              href={`${chain.explorerUrl}/address/${bounty.escrowAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-sm text-zinc-400 hover:text-white"
            >
              View escrow on explorer <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {bounty.txHash && (
            <a
              href={`${chain.explorerUrl}/tx/${bounty.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-sm text-zinc-400 hover:text-white"
            >
              View creation tx <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

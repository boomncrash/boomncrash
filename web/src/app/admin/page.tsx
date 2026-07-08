"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Zap, Users } from "lucide-react";
import type { Bounty, Submission, Dispute } from "@/lib/types";
import { truncateAddress, formatUsdc, rallyProgressPercent } from "@/lib/utils";

const ADMIN_SECRET_KEY = "bountly_admin_secret";

function adminHeaders(): HeadersInit {
  const secret = sessionStorage.getItem(ADMIN_SECRET_KEY);
  return secret
    ? { "x-admin-secret": secret, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export default function AdminPage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fundingRallies, setFundingRallies] = useState<Bounty[]>([]);
  const [openDisputes, setOpenDisputes] = useState<Dispute[]>([]);
  const [referralLeaderboard, setReferralLeaderboard] = useState<
    { referrerWallet: string; referralCount: number }[]
  >([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [tab, setTab] = useState<
    "bounties" | "submissions" | "rallies" | "disputes" | "referrals"
  >("bounties");
  const [adminSecret, setAdminSecret] = useState("");
  const [authError, setAuthError] = useState("");
  const [savedSecret, setSavedSecret] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_SECRET_KEY);
    if (stored) setSavedSecret(stored);
  }, []);

  const refresh = useCallback(async () => {
    const queueRes = await fetch("/api/admin/queue", { headers: adminHeaders() });
    if (queueRes.status === 401) {
      setAuthError("Invalid or missing admin secret. Set ADMIN_SECRET in env and enter it below.");
      return;
    }
    setAuthError("");
    const queue = await queueRes.json();
    setBounties(queue.pendingBounties ?? []);
    setSubmissions(queue.pendingSubmissions ?? []);
    setFundingRallies(queue.fundingRallies ?? []);
    setOpenDisputes(queue.openDisputes ?? []);
    setReferralLeaderboard(queue.referralLeaderboard ?? []);
    setTotalReferrals(queue.totalReferrals ?? 0);
  }, []);

  useEffect(() => {
    if (savedSecret || process.env.NODE_ENV === "development") {
      void refresh();
    }
  }, [savedSecret, refresh]);

  const saveSecret = () => {
    sessionStorage.setItem(ADMIN_SECRET_KEY, adminSecret);
    setSavedSecret(adminSecret);
    setAuthError("");
    void refresh();
  };

  const moderateBounty = async (id: string, status: "open" | "rejected") => {
    const res = await fetch(`/api/bounties/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to update bounty");
      return;
    }
    refresh();
  };

  const reviewSubmission = async (id: string, status: "approved" | "rejected") => {
    const res = await fetch(`/api/submissions/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to review submission");
      return;
    }
    refresh();
  };

  const resolveDispute = async (id: string, action: "dismiss" | "uphold") => {
    const res = await fetch(`/api/disputes/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to resolve dispute");
      return;
    }
    refresh();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Admin Moderation</h1>
      <p className="mt-2 text-zinc-400">
        Review bounties, submissions, and disputes. Funded Rallies appear when ready for approval.
      </p>

      <div className="mt-6 rounded-xl border border-white/10 p-4">
        <label className="block text-sm font-medium text-zinc-300">Admin secret</label>
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="ADMIN_SECRET from server env"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          />
          <button
            onClick={saveSecret}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Save
          </button>
        </div>
        {authError && <p className="mt-2 text-sm text-red-300">{authError}</p>}
        {!savedSecret && process.env.NODE_ENV === "production" && (
          <p className="mt-2 text-xs text-amber-400">Required in production.</p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(["bounties", "rallies", "submissions", "disputes", "referrals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t ? "bg-white/10 text-white" : "text-zinc-400"
            }`}
          >
            {t === "bounties" && `Pending (${bounties.length})`}
            {t === "rallies" && `Funding Rallies (${fundingRallies.length})`}
            {t === "submissions" && `Submissions (${submissions.length})`}
            {t === "disputes" && `Disputes (${openDisputes.length})`}
            {t === "referrals" && `Referrals (${totalReferrals})`}
          </button>
        ))}
      </div>

      {tab === "bounties" && (
        <div className="mt-8 space-y-4">
          {bounties.length === 0 ? (
            <p className="text-zinc-500">No bounties pending review.</p>
          ) : (
            bounties.map((b) => (
              <div key={b.id} className="rounded-xl border border-white/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{b.title}</h3>
                      {b.isRally && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
                          <Zap className="h-3 w-3" /> Rally
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">{b.description.slice(0, 120)}...</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {formatUsdc(b.rewardUsdc)} · {b.chain} · {truncateAddress(b.creatorAddress)}
                      {b.isRally && (
                        <> · {formatUsdc(b.rallyFunded ?? 0)} raised ({b.backerCount ?? 0} backers)</>
                      )}
                      {b.escrowAddress && <> · escrow set</>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => moderateBounty(b.id, "open")}
                      title="Approve"
                      className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/30"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moderateBounty(b.id, "rejected")}
                      title="Reject"
                      className="rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30"
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

      {tab === "rallies" && (
        <div className="mt-8 space-y-4">
          {fundingRallies.length === 0 ? (
            <p className="text-zinc-500">No Rallies currently funding.</p>
          ) : (
            fundingRallies.map((b) => (
              <div key={b.id} className="rounded-xl border border-cyan-500/20 p-5">
                <h3 className="font-medium">{b.title}</h3>
                <p className="mt-2 text-sm text-cyan-400">
                  {rallyProgressPercent(b.rewardUsdc, b.rallyFunded ?? 0)}% ·{" "}
                  {formatUsdc(b.rallyFunded ?? 0)} / {formatUsdc(b.rewardUsdc)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {b.backerCount ?? 0} backers · {truncateAddress(b.creatorAddress)}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "submissions" && (
        <div className="mt-8 space-y-4">
          {submissions.length === 0 ? (
            <p className="text-zinc-500">No submissions pending review.</p>
          ) : (
            submissions.map((s) => (
              <div key={s.id} className="rounded-xl border border-white/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-500">Bounty: {s.bountyId}</p>
                    <p className="mt-1 font-medium">{s.proofDescription}</p>
                    <a
                      href={s.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-emerald-400 hover:underline"
                    >
                      {s.proofUrl}
                    </a>
                    <p className="mt-2 text-xs text-zinc-500">
                      Hunter: {truncateAddress(s.hunterAddress)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewSubmission(s.id, "approved")}
                      className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => reviewSubmission(s.id, "rejected")}
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

      {tab === "disputes" && (
        <div className="mt-8 space-y-4">
          {openDisputes.length === 0 ? (
            <p className="text-zinc-500">No open disputes.</p>
          ) : (
            openDisputes.map((d) => (
              <div key={d.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/bounty/${d.bountyId}`}
                      className="font-medium hover:text-emerald-400"
                    >
                      Bounty {d.bountyId.slice(0, 8)}…
                    </Link>
                    <p className="mt-2 text-sm text-zinc-400">{d.reason}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Filed by {truncateAddress(d.filerAddress)} ·{" "}
                      {new Date(d.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveDispute(d.id, "dismiss")}
                      title="Dismiss — continue payout"
                      className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs text-emerald-400"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => resolveDispute(d.id, "uphold")}
                      title="Uphold — cancel bounty"
                      className="rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-400"
                    >
                      Uphold
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "referrals" && (
        <div className="mt-8">
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <Users className="h-5 w-5 text-violet-400" />
            <div>
              <p className="font-medium text-violet-300">{totalReferrals} total attributions</p>
              <p className="text-sm text-zinc-500">
                Wallets that connected after landing via a referral link
              </p>
            </div>
          </div>
          {referralLeaderboard.length === 0 ? (
            <p className="text-zinc-500">No referrals recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {referralLeaderboard.map((entry, i) => (
                <div
                  key={entry.referrerWallet}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-500">#{i + 1}</span>
                    <span className="font-mono text-sm">{truncateAddress(entry.referrerWallet)}</span>
                  </div>
                  <span className="text-sm text-violet-300">
                    {entry.referralCount} referral{entry.referralCount === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

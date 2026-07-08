"use client";

import { useEffect, useState } from "react";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface EmailSettingsPanelProps {
  walletAddress: string;
}

interface PrefsState {
  email: string;
  enabled: boolean;
  emailVerified: boolean;
  notifySubmissions: boolean;
  notifyReviews: boolean;
  notifyPayouts: boolean;
  notifyRally: boolean;
  notifyNewBounties: boolean;
}

const defaults: PrefsState = {
  email: "",
  enabled: true,
  emailVerified: false,
  notifySubmissions: true,
  notifyReviews: true,
  notifyPayouts: true,
  notifyRally: true,
  notifyNewBounties: true,
};

export function EmailSettingsPanel({ walletAddress }: EmailSettingsPanelProps) {
  const [prefs, setPrefs] = useState<PrefsState>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/settings/email?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) {
          setPrefs({
            email: data.preferences.email,
            enabled: data.preferences.enabled,
            emailVerified: data.preferences.emailVerified ?? false,
            notifySubmissions: data.preferences.notifySubmissions,
            notifyReviews: data.preferences.notifyReviews,
            notifyPayouts: data.preferences.notifyPayouts,
            notifyRally: data.preferences.notifyRally,
            notifyNewBounties: data.preferences.notifyNewBounties ?? true,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    setVerificationSent(false);

    try {
      const res = await fetch("/api/settings/email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ walletAddress, ...prefs }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      if (data.preferences) {
        setPrefs((p) => ({
          ...p,
          emailVerified: data.preferences.emailVerified ?? false,
        }));
      }
      if (data.verificationSent) setVerificationSent(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Omit<PrefsState, "email" | "emailVerified">) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/email/resend", {
        method: "POST",
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Resend failed");
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resend failed");
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 p-6 text-sm text-zinc-500">
        Loading email settings…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-emerald-400" />
        <h2 className="font-semibold">Email alerts</h2>
        {prefs.email && prefs.emailVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </span>
        )}
        {prefs.email && !prefs.emailVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
            <AlertCircle className="h-3 w-3" /> Pending verification
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Verify your email to receive alerts. We send a confirmation link on save.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="text-zinc-400">Email address</span>
          <input
            type="email"
            value={prefs.email}
            onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.value, emailVerified: false }))}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={handleSave}
          disabled={saving || !prefs.email}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>

      {verificationSent && (
        <p className="mt-2 text-sm text-cyan-400">
          Check your inbox for a verification link (expires in 24 hours).
        </p>
      )}
      {prefs.email && !prefs.emailVerified && (
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mt-2 text-sm text-emerald-400 hover:underline disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend verification email"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[
          { key: "enabled" as const, label: "Email alerts enabled" },
          { key: "notifySubmissions" as const, label: "New submissions (creators)" },
          { key: "notifyReviews" as const, label: "Review updates (hunters)" },
          { key: "notifyPayouts" as const, label: "Payout confirmations" },
          { key: "notifyRally" as const, label: "Rally milestones" },
          { key: "notifyNewBounties" as const, label: "New bounties in followed categories" },
        ].map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => toggle(key)}
              className="rounded border-white/20"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

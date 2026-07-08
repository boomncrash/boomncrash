"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, Plus, RefreshCw, Star } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useWallet } from "@/components/wallet-context";
import { CHAINS } from "@/lib/constants";
import { formatUsdc, truncateAddress } from "@/lib/utils";
import { getUsdcBalance, isEscrowConfigured } from "@/lib/contracts/base-escrow";
import { isSolanaEscrowConfigured } from "@/lib/contracts/solana-escrow";
import type { Address } from "viem";
import { getBaseNetworkLabel } from "@/lib/wallet-ethereum";

export default function WalletPage() {
  const {
    user,
    isAuthenticated,
    isLoading,
    wallets,
    login,
    signup,
    generateWallet,
  } = useAuth();
  const { address, isConnected } = useWallet();
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const onramperKey = process.env.NEXT_PUBLIC_ONRAMPER_API_KEY;

  const primarySolana = wallets.find((w) => w.chain === "solana" && w.isPrimary)?.address;

  const refreshBalance = async () => {
    if (!address) return;
    setLoadingBalance(true);
    try {
      const bal = await getUsdcBalance(address as Address);
      setUsdcBalance(bal);
    } catch {
      setUsdcBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (!address) return;
    void (async () => {
      setLoadingBalance(true);
      try {
        const bal = await getUsdcBalance(address as Address);
        setUsdcBalance(bal);
      } catch {
        setUsdcBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    })();
  }, [address]);

  if (isLoading) {
    return <div className="py-20 text-center text-zinc-400">Loading account…</div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Your account</h1>
        <p className="mt-3 text-zinc-400">
          Sign in with email via Privy. Base and Solana wallets are created automatically.
        </p>
        <button
          onClick={() => signup()}
          className="mt-6 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-black"
        >
          Create account
        </button>
        <button
          onClick={() => login()}
          className="mt-3 block w-full text-sm text-emerald-400 hover:underline"
        >
          Already have an account? Sign in
        </button>
      </div>
    );
  }

  const handleGenerate = async (chain: "base" | "solana") => {
    setActionError(null);
    try {
      await generateWallet(chain);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create wallet");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Account</h1>
      <p className="mt-2 text-zinc-400">Signed in as {user.email}</p>

      {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your wallets</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleGenerate("base")}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
              >
                <Plus className="h-3 w-3" /> Base
              </button>
              <button
                onClick={() => handleGenerate("solana")}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
              >
                <Plus className="h-3 w-3" /> Solana
              </button>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {wallets.map((wallet) => (
              <li
                key={wallet.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-zinc-500">{wallet.chain}</span>
                    {wallet.isPrimary && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                        <Star className="h-3 w-3" /> Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-sm">{wallet.address}</p>
                  {wallet.label && <p className="text-xs text-zinc-500">{wallet.label}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="font-semibold">Primary Base wallet</h2>
          {isConnected && address ? (
            <>
              <p className="mt-2 font-mono text-sm text-emerald-400">{address}</p>
              <p className="mt-1 text-sm text-zinc-500">Network: {getBaseNetworkLabel()}</p>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div>
                  <p className="text-xs text-zinc-500">USDC Balance</p>
                  <p className="text-xl font-semibold text-emerald-400">
                    {usdcBalance !== null ? formatUsdc(usdcBalance) : "—"}
                  </p>
                </div>
                <button
                  onClick={refreshBalance}
                  disabled={loadingBalance}
                  className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingBalance ? "animate-spin" : ""}`} />
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">No primary Base wallet yet.</p>
          )}
          {isEscrowConfigured() && (
            <p className="mt-3 text-xs text-emerald-400">Base escrow contracts connected</p>
          )}
        </section>

        {primarySolana && (
          <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6">
            <h2 className="font-semibold">Primary Solana wallet</h2>
            <p className="mt-2 font-mono text-sm text-purple-300">{primarySolana}</p>
            {isSolanaEscrowConfigured() && (
              <p className="mt-3 text-xs text-purple-300">Solana escrow program connected</p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-emerald-400" />
            <h2 className="font-semibold">Buy USDC</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            Fund your primary Base wallet ({address ? truncateAddress(address) : "—"}) with local currency.
          </p>

          {onramperKey && address ? (
            <div className="mt-4">
              <iframe
                src={`https://buy.onramper.com?apiKey=${onramperKey}&defaultCrypto=USDC_BASE&defaultFiat=NGN&wallets=base:${address}`}
                title="Buy USDC"
                className="h-[580px] w-full rounded-xl border border-white/10"
                allow="accelerometer; autoplay; camera; gyroscope; payment"
              />
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center">
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
              >
                Get free testnet USDC <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </section>

        {address && (
          <section className="rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold">Explorer</h2>
            <a
              href={`${CHAINS.base.explorerUrl}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
            >
              View on BaseScan <ExternalLink className="h-3 w-3" />
            </a>
          </section>
        )}
      </div>
    </div>
  );
}

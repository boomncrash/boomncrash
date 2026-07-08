"use client";

import { useEffect, useState } from "react";
import { Check, Copy, CreditCard, ExternalLink, Plus, RefreshCw, Star } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useWallet } from "@/components/wallet-context";
import { CHAINS } from "@/lib/constants";
import { getSolanaExplorerUrl } from "@/lib/chain-config";
import { formatUsdc, truncateAddress } from "@/lib/utils";
import { getUsdcBalance, isEscrowConfigured } from "@/lib/contracts/base-escrow";
import { isSolanaEscrowConfigured } from "@/lib/contracts/solana-escrow";
import type { Address } from "viem";
import { getBaseNetworkLabel } from "@/lib/wallet-ethereum";

function CopyAddressButton({ address, label = "Copy address" }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
      aria-label={label}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

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
  const [generatingChain, setGeneratingChain] = useState<"base" | "solana" | null>(null);
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
    setGeneratingChain(chain);
    try {
      await generateWallet(chain);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create wallet");
    } finally {
      setGeneratingChain(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Account</h1>
      <p className="mt-2 text-zinc-400">Signed in as {user.email}</p>

      {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-white/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Your wallets</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Copy an address to receive funds, or add another wallet below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenerate("base")}
                disabled={generatingChain !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {generatingChain === "base" ? "Adding…" : "Add Base wallet"}
              </button>
              <button
                type="button"
                onClick={() => handleGenerate("solana")}
                disabled={generatingChain !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/15 px-3 py-2 text-xs font-medium text-purple-300 transition hover:bg-purple-500/25 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {generatingChain === "solana" ? "Adding…" : "Add Solana wallet"}
              </button>
            </div>
          </div>

          {wallets.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
              No wallets yet. Add a Base or Solana wallet to get started.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {wallets.map((wallet) => (
                <li
                  key={wallet.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-zinc-500">{wallet.chain}</span>
                      {wallet.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                          <Star className="h-3 w-3" /> Primary
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-all font-mono text-sm">{wallet.address}</p>
                    {wallet.label && <p className="text-xs text-zinc-500">{wallet.label}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyAddressButton address={wallet.address} />
                    <a
                      href={
                        wallet.chain === "base"
                          ? `${CHAINS.base.explorerUrl}/address/${wallet.address}`
                          : getSolanaExplorerUrl(`/address/${wallet.address}`)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                    >
                      Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="font-semibold">Primary Base wallet</h2>
          {isConnected && address ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="break-all font-mono text-sm text-emerald-400">{address}</p>
                <CopyAddressButton address={address} label="Copy Base address" />
              </div>
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="break-all font-mono text-sm text-purple-300">{primarySolana}</p>
              <CopyAddressButton address={primarySolana} label="Copy Solana address" />
            </div>
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

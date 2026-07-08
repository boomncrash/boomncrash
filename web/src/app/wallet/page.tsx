"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { CHAINS } from "@/lib/constants";
import { formatUsdc } from "@/lib/utils";
import { getUsdcBalance, isEscrowConfigured } from "@/lib/contracts/base-escrow";
import { isSolanaEscrowConfigured } from "@/lib/contracts/solana-escrow";
import type { Address } from "viem";

export default function WalletPage() {
  const { address, isConnected, chainId, isBaseSepolia, switchToBaseSepolia } = useWallet();
  const {
    publicKey: solanaAddress,
    isConnected: isSolanaConnected,
    connect: connectSolana,
    disconnect: disconnectSolana,
  } = useSolanaWallet();
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const onramperKey = process.env.NEXT_PUBLIC_ONRAMPER_API_KEY;

  const refreshBalance = async () => {
    if (!address || !isBaseSepolia) return;
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
    if (!address || !isBaseSepolia) return;
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
  }, [address, isBaseSepolia]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Wallet</h1>
      <p className="mt-2 text-zinc-400">
        Connect wallets, buy USDC with local currency, and manage balances.
      </p>

      <div className="mt-8 space-y-6">
          {/* Base (EVM) */}
          <section className="rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold">Base (EVM)</h2>
            {!isConnected ? (
              <p className="mt-2 text-sm text-zinc-500">Connect via header (MetaMask)</p>
            ) : (
              <>
                <p className="mt-2 font-mono text-sm text-emerald-400">{address}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Network: {isBaseSepolia ? "Base Sepolia" : chainId ? `Chain ${chainId}` : "Unknown"}
                </p>
                {!isBaseSepolia && (
                  <button
                    onClick={() => switchToBaseSepolia()}
                    className="mt-3 rounded-full bg-[#0052FF] px-4 py-2 text-sm font-medium text-white"
                  >
                    Switch to Base Sepolia
                  </button>
                )}
                {isBaseSepolia && (
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
                )}
              </>
            )}
            {isEscrowConfigured() && (
              <p className="mt-3 text-xs text-emerald-400">Base escrow contracts connected</p>
            )}
          </section>

          {/* Solana */}
          <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6">
            <h2 className="font-semibold">Solana</h2>
            {!isSolanaConnected ? (
              <button
                onClick={() => connectSolana()}
                className="mt-3 rounded-full bg-[#9945FF] px-4 py-2 text-sm font-medium text-white"
              >
                Connect Phantom
              </button>
            ) : (
              <>
                <p className="mt-2 font-mono text-sm text-purple-300">{solanaAddress}</p>
                <button
                  onClick={() => disconnectSolana()}
                  className="mt-2 text-xs text-zinc-500 hover:text-white"
                >
                  Disconnect
                </button>
              </>
            )}
            {isSolanaEscrowConfigured() && (
              <p className="mt-3 text-xs text-purple-300">Solana escrow program connected</p>
            )}
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-emerald-400" />
              <h2 className="font-semibold">Buy USDC</h2>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Purchase USDC with NGN (default), USD, EUR, PHP and more.
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
            ) : onramperKey ? (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                Connect your Base wallet above to buy USDC with NGN via Onramper.
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center">
                <p className="text-sm text-zinc-400">
                  Onramper widget appears when{" "}
                  <code className="text-emerald-400">NEXT_PUBLIC_ONRAMPER_API_KEY</code> is set.
                </p>
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                >
                  Get free testnet USDC <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold">Useful Links</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                {address && (
                  <a
                    href={`${CHAINS.base.explorerUrl}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    View on BaseScan →
                  </a>
                )}
              </li>
              <li>
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  Circle USDC Faucet (Base Sepolia) →
                </a>
              </li>
            </ul>
          </section>
        </div>
    </div>
  );
}

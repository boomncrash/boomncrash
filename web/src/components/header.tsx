"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Menu, X } from "lucide-react";
import { useState } from "react";
import { APP_NAME } from "@/lib/constants";
import { cn, truncateAddress } from "@/lib/utils";
import { useWallet } from "@/components/wallet-context";
import { NotificationBell } from "@/components/notification-bell";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/create", label: "Post Bounty" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/wallet", label: "Wallet" },
];

export function Header() {
  const pathname = usePathname();
  const { address, isConnected, isConnecting, connect, disconnect, isBaseSepolia, chainId } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 font-bold text-black">
            B
          </div>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === link.href
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <NotificationBell />
          {isConnected && address ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href={`/profile/${address}`}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10 hover:text-emerald-400"
              >
                <Wallet className="h-4 w-4 text-emerald-400" />
                <span
                  className={`h-2 w-2 rounded-full ${isBaseSepolia ? "bg-emerald-400" : "bg-amber-400"}`}
                  title={isBaseSepolia ? "Base Sepolia" : `Chain ${chainId}`}
                />
                {truncateAddress(address)}
              </Link>
              <button
                onClick={() => disconnect()}
                className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:text-white"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect()}
              disabled={isConnecting}
              className="hidden rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50 md:block"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  pathname === link.href ? "bg-white/10 text-white" : "text-zinc-400"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isConnected && address ? (
              <button
                onClick={() => disconnect()}
                className="mt-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-zinc-400"
              >
                {truncateAddress(address)} — Disconnect
              </button>
            ) : (
              <button
                onClick={() => connect()}
                className="mt-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-black"
              >
                Connect Wallet
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

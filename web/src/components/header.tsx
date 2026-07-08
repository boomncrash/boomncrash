"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Menu, X } from "lucide-react";
import { useState } from "react";
import { APP_NAME } from "@/lib/constants";
import { cn, truncateAddress } from "@/lib/utils";
import { useAuth } from "@/components/auth-context";
import { NotificationBell } from "@/components/notification-bell";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/create", label: "Post Bounty" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/wallet", label: "Account" },
];

export function Header() {
  const pathname = usePathname();
  const {
    user,
    isAuthenticated,
    isLoading,
    primaryBaseAddress,
    login,
    signup,
    logout,
  } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const profileAddress = primaryBaseAddress ?? user?.wallets[0]?.address;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 font-bold text-black">
            b
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

        <div className="flex items-center gap-2 md:gap-3">
          <NotificationBell />
          {isLoading ? (
            <div className="hidden h-9 w-24 animate-pulse rounded-full bg-white/5 md:block" />
          ) : isAuthenticated && user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href={profileAddress ? `/profile/${encodeURIComponent(profileAddress)}` : "/wallet"}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10 hover:text-emerald-400"
              >
                <User className="h-4 w-4 text-emerald-400" />
                <span className="max-w-[120px] truncate">{user.email}</span>
              </Link>
              {profileAddress && (
                <span className="text-xs text-zinc-500">{truncateAddress(profileAddress)}</span>
              )}
              <button
                onClick={() => logout()}
                className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => login()}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
              >
                Sign in
              </button>
              <button
                onClick={() => signup()}
                className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Create account
              </button>
            </div>
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
            {isAuthenticated && user ? (
              <button
                onClick={() => {
                  void logout();
                  setMobileOpen(false);
                }}
                className="mt-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-zinc-400"
              >
                {user.email} — Sign out
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    void login();
                    setMobileOpen(false);
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    void signup();
                    setMobileOpen(false);
                  }}
                  className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-black"
                >
                  Create account
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

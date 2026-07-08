import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0f]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 font-bold text-black">
                B
              </div>
              <span className="text-lg font-semibold">{APP_NAME}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-zinc-400">{APP_TAGLINE}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Global USDC bounty marketplace on Base & Solana.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><Link href="/explore" className="hover:text-white">Explore Bounties</Link></li>
              <li><Link href="/create" className="hover:text-white">Post a Bounty</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved. 3% platform fee on payouts.
        </div>
      </div>
    </footer>
  );
}

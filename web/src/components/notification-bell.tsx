"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useWallet } from "@/components/wallet-context";
import { useSolanaWallet } from "@/components/solana-wallet-context";
import type { Notification } from "@/lib/types";

export function NotificationBell() {
  const { address, isConnected } = useWallet();
  const { publicKey, isConnected: isSolanaConnected } = useSolanaWallet();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const walletKey = [address, publicKey].filter(Boolean).join(",");

  const refresh = useCallback(async () => {
    const activeWallets = walletKey.split(",").filter(Boolean);
    if (activeWallets.length === 0) return;

    const results = await Promise.all(
      activeWallets.map((w) =>
        fetch(`/api/notifications?wallet=${encodeURIComponent(w)}`).then((r) => r.json())
      )
    );

    const merged = results
      .flatMap((r) => r.notifications ?? [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const seen = new Set<string>();
    const unique = merged.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    setNotifications(unique.slice(0, 20));
    setUnreadCount(unique.filter((n) => !n.read).length);
  }, [walletKey]);

  useEffect(() => {
    if (!isConnected && !isSolanaConnected) return;
    void refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [isConnected, isSolanaConnected, refresh]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    const activeWallets = walletKey.split(",").filter(Boolean);
    await Promise.all(
      activeWallets.map((w) =>
        fetch("/api/notifications/read-all", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: w }),
        })
      )
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (!isConnected && !isSolanaConnected) return null;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
        className="relative rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 bg-[#12121a] shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? "#"}
                    onClick={() => {
                      if (!n.read) void markRead(n.id);
                      setOpen(false);
                    }}
                    className={`block border-b border-white/5 px-4 py-3 transition hover:bg-white/5 ${
                      !n.read ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-zinc-200">{n.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{n.message}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

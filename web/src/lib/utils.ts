import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FX_RATES, PLATFORM_FEE_BPS } from "./constants";
import type { DisplayCurrency } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsdc(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function usdcToLocal(usdc: number, currency: DisplayCurrency): string {
  const rate = FX_RATES[currency] ?? 1;
  const localAmount = usdc * rate;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(localAmount);
}

export function calculatePayout(rewardUsdc: number) {
  const fee = (rewardUsdc * PLATFORM_FEE_BPS) / 10000;
  const hunterPayout = rewardUsdc - fee;
  return { fee, hunterPayout };
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function containsProhibitedContent(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function daysUntil(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function rallyProgressPercent(rewardUsdc: number, rallyFunded = 0): number {
  if (rewardUsdc <= 0) return 0;
  return Math.min(100, Math.round((rallyFunded / rewardUsdc) * 100));
}

export function rallyRemaining(rewardUsdc: number, rallyFunded = 0): number {
  return Math.max(0, rewardUsdc - rallyFunded);
}

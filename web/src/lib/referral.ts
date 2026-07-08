const REFERRAL_KEY = "bountly_referral";

export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref && ref.length >= 8 && ref.length <= 100) {
    localStorage.setItem(REFERRAL_KEY, ref);
  }
}

export function getStoredReferral(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFERRAL_KEY);
}

export function clearStoredReferral(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_KEY);
}

export function referralLinkFor(walletAddress: string, path = ""): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? base ?? "http://localhost:3000";
  const normalizedPath = path.startsWith("/") ? path : path ? `/${path}` : "";
  const url = new URL(`${appUrl}${normalizedPath}`);
  url.searchParams.set("ref", walletAddress);
  return url.toString();
}

export function appendReferralToUrl(url: string, walletAddress?: string | null): string {
  if (!walletAddress) return url;
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
    parsed.searchParams.set("ref", walletAddress);
    return parsed.toString();
  } catch {
    return url;
  }
}

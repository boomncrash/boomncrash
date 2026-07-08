import type { Chain, BountyCategory, BountyStatus, ChainId } from "@/lib/types";

export const APP_NAME = "Bountly";
export const APP_TAGLINE = "Fund tasks. Get paid in USDC.";
export const PLATFORM_FEE_BPS = 300; // 3%
export const DISPUTE_WINDOW_HOURS = 48;
export const RALLY_CREATOR_SEED_PERCENT = 20; // Creator seeds 20%, community fills 80%

export const BOUNTY_CATEGORIES: {
  id: BountyCategory;
  label: string;
  description: string;
  minReward: number;
  maxReward: number;
}[] = [
  {
    id: "social",
    label: "Social",
    description: "X posts, quote tweets, engagement, community tasks",
    minReward: 5,
    maxReward: 500,
  },
  {
    id: "content",
    label: "Content",
    description: "Memes, clips, graphics, threads, UGC video",
    minReward: 10,
    maxReward: 2500,
  },
  {
    id: "product_testing",
    label: "Product Testing",
    description: "App tests, bug reports, surveys, beta feedback",
    minReward: 5,
    maxReward: 1000,
  },
];

export const BOUNTY_STATUSES: Record<BountyStatus, string> = {
  draft: "Draft",
  pending_moderation: "Pending Review",
  funding: "Rally — Funding",
  open: "Open",
  in_progress: "In Progress",
  submitted: "Submitted",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
  expired: "Expired",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

export const CHAINS: Record<ChainId, Chain> = {
  base: {
    id: "base",
    name: "Base",
    network: "base-sepolia",
    chainId: 84532,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    color: "#0052FF",
  },
  solana: {
    id: "solana",
    name: "Solana",
    network: "devnet",
    nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
    rpcUrl: "https://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com/?cluster=devnet",
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    color: "#9945FF",
  },
  arc: {
    id: "arc",
    name: "Arc",
    network: "arc-testnet",
    chainId: 5042002,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
    rpcUrl: "https://rpc.testnet.arc.network",
    explorerUrl: "https://testnet.arcscan.app",
    usdcAddress: "0x3600000000000000000000000000000000000000",
    color: "#2775CA",
    devOnly: true,
  },
};

export const PROHIBITED_KEYWORDS = [
  "violence",
  "kill",
  "harm yourself",
  "doxx",
  "illegal",
  "hack account",
  "steal",
];

export const FX_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1550,
  PHP: 56,
  EUR: 0.92,
  GBP: 0.79,
  BRL: 5.6,
};

export const SUPPORTED_DISPLAY_CURRENCIES = ["USD", "NGN", "PHP", "EUR", "GBP", "BRL"] as const;

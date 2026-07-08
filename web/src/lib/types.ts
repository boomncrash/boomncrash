export type ChainId = "base" | "solana" | "arc";

export type BountyCategory = "social" | "content" | "product_testing";

export type BountyStatus =
  | "draft"
  | "funding"
  | "pending_moderation"
  | "open"
  | "in_progress"
  | "submitted"
  | "approved"
  | "paid"
  | "rejected"
  | "expired"
  | "disputed"
  | "cancelled";

export type SubmissionStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid";

export interface Chain {
  id: ChainId;
  name: string;
  network: string;
  chainId?: number;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  explorerUrl: string;
  usdcAddress?: string;
  usdcMint?: string;
  color: string;
  devOnly?: boolean;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  deliverables: string;
  category: BountyCategory;
  chain: ChainId;
  rewardUsdc: number;
  status: BountyStatus;
  creatorAddress: string;
  escrowAddress?: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
  txHash?: string;
  isRally?: boolean;
  rallyFunded?: number;
  creatorSeed?: number;
  backerCount?: number;
}

export interface RallyContribution {
  id: string;
  bountyId: string;
  backerAddress: string;
  amountUsdc: number;
  chain: ChainId;
  txHash?: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  bountyId: string;
  hunterAddress: string;
  proofUrl: string;
  proofDescription: string;
  status: SubmissionStatus;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  payoutTxHash?: string;
}

export interface User {
  id: string;
  walletAddresses: string[];
  displayName?: string;
  reputationScore: number;
  completedBounties: number;
  createdAt: string;
}

export interface CreateBountyInput {
  title: string;
  description: string;
  deliverables: string;
  category: BountyCategory;
  chain: ChainId;
  rewardUsdc: number;
  deadline: string;
  creatorAddress: string;
  escrowAddress?: string;
  txHash?: string;
  isRally?: boolean;
}

export interface CreateSubmissionInput {
  bountyId: string;
  hunterAddress: string;
  proofUrl: string;
  proofDescription: string;
}

export interface CreateRallyContributionInput {
  bountyId: string;
  backerAddress: string;
  amountUsdc: number;
  chain: ChainId;
  txHash?: string;
}

export type DisplayCurrency = "USD" | "NGN" | "PHP" | "EUR" | "GBP" | "BRL";

export type NotificationType =
  | "submission_received"
  | "submission_approved"
  | "submission_rejected"
  | "submission_paid"
  | "rally_milestone"
  | "rally_funded"
  | "bounty_open"
  | "bounty_available";

export interface Notification {
  id: string;
  walletAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface HunterProfile {
  address: string;
  displayName?: string;
  reputationScore: number;
  completedBounties: number;
  totalEarnedUsdc: number;
  submissionsCount: number;
  bountiesCreated: number;
  approvalRate: number;
  rallyBacked: number;
  memberSince: string;
}

export interface EmailPreferences {
  walletAddress: string;
  email: string;
  enabled: boolean;
  emailVerified: boolean;
  notifySubmissions: boolean;
  notifyReviews: boolean;
  notifyPayouts: boolean;
  notifyRally: boolean;
  notifyNewBounties: boolean;
  updatedAt: string;
}

export type DisputeStatus = "open" | "resolved" | "dismissed";

export interface Dispute {
  id: string;
  bountyId: string;
  submissionId: string;
  filerAddress: string;
  reason: string;
  status: DisputeStatus;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateDisputeInput {
  bountyId: string;
  submissionId: string;
  filerAddress: string;
  reason: string;
}

export interface ReferralAttribution {
  refereeWallet: string;
  referrerWallet: string;
  createdAt: string;
}

export interface ReferralStats {
  referralCount: number;
  referredBy?: string;
}

export interface BountyListItem extends Bounty {
  creatorBadges?: { id: string; label: string; description: string; emoji: string; color: string }[];
  creatorTier?: { label: string; color: string };
  creatorReputationScore?: number;
}

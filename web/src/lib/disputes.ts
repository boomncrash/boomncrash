import { DISPUTE_WINDOW_HOURS } from "@/lib/constants";
import type { Bounty, Submission } from "@/lib/types";

function addressesEqual(a: string, b: string): boolean {
  if (a.length > 40 || b.length > 40) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

export function approvedSubmission(_bounty: Bounty, submissions: Submission[]): Submission | undefined {
  return submissions.find((s) => s.status === "approved");
}

export function isWithinDisputeWindow(submission: Submission): boolean {
  const approvedAt = new Date(submission.updatedAt).getTime();
  const windowMs = DISPUTE_WINDOW_HOURS * 60 * 60 * 1000;
  return Date.now() - approvedAt < windowMs;
}

export function canFileDispute(
  bounty: Bounty,
  submission: Submission | undefined,
  walletAddress?: string | null
): boolean {
  if (!submission || !walletAddress) return false;
  if (bounty.status !== "approved" && bounty.status !== "disputed") return false;
  if (!isWithinDisputeWindow(submission)) return false;

  const isCreator = addressesEqual(bounty.creatorAddress, walletAddress);
  const isHunter = addressesEqual(submission.hunterAddress, walletAddress);
  return isCreator || isHunter;
}

export function disputeWindowEndsAt(submission: Submission): Date {
  const approvedAt = new Date(submission.updatedAt).getTime();
  return new Date(approvedAt + DISPUTE_WINDOW_HOURS * 60 * 60 * 1000);
}

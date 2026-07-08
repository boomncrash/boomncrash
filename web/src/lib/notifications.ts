import type { NotificationType } from "@/lib/types";
import { createNotification as persistNotification } from "@/lib/repository";
import { sendUserNotificationEmail } from "@/lib/user-email";

export async function notify(params: {
  walletAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await persistNotification(params);
    void sendUserNotificationEmail(params);
  } catch {
    // Non-blocking
  }
}

export async function notifySubmissionReceived(
  creatorAddress: string,
  bountyId: string,
  bountyTitle: string
) {
  await notify({
    walletAddress: creatorAddress,
    type: "submission_received",
    title: "New submission",
    message: `Someone submitted proof for "${bountyTitle}"`,
    link: `/bounty/${bountyId}`,
  });
}

export async function notifySubmissionApproved(
  hunterAddress: string,
  bountyId: string,
  bountyTitle: string
) {
  await notify({
    walletAddress: hunterAddress,
    type: "submission_approved",
    title: "Submission approved",
    message: `Your work on "${bountyTitle}" was approved`,
    link: `/bounty/${bountyId}`,
  });
}

export async function notifySubmissionRejected(
  hunterAddress: string,
  bountyId: string,
  bountyTitle: string
) {
  await notify({
    walletAddress: hunterAddress,
    type: "submission_rejected",
    title: "Submission rejected",
    message: `Your submission for "${bountyTitle}" was not accepted`,
    link: `/bounty/${bountyId}`,
  });
}

export async function notifySubmissionPaid(
  hunterAddress: string,
  bountyId: string,
  bountyTitle: string,
  amountUsdc: number
) {
  await notify({
    walletAddress: hunterAddress,
    type: "submission_paid",
    title: "USDC received",
    message: `You earned $${amountUsdc} USDC for "${bountyTitle}"`,
    link: `/profile/${hunterAddress}`,
  });
}

export async function notifyRallyMilestone(
  creatorAddress: string,
  bountyId: string,
  bountyTitle: string,
  percent: number
) {
  await notify({
    walletAddress: creatorAddress,
    type: "rally_milestone",
    title: `Rally ${percent}% funded`,
    message: `"${bountyTitle}" hit ${percent}% of its funding goal`,
    link: `/bounty/${bountyId}`,
  });
}

export async function notifyRallyFunded(
  creatorAddress: string,
  bountyId: string,
  bountyTitle: string
) {
  await notify({
    walletAddress: creatorAddress,
    type: "rally_funded",
    title: "Rally fully funded",
    message: `"${bountyTitle}" is fully funded and awaiting review`,
    link: `/bounty/${bountyId}`,
  });
}

export async function notifyBountyOpen(
  creatorAddress: string,
  bountyId: string,
  bountyTitle: string
) {
  await notify({
    walletAddress: creatorAddress,
    type: "bounty_open",
    title: "Bounty is live",
    message: `"${bountyTitle}" is now open for hunters`,
    link: `/bounty/${bountyId}`,
  });
}

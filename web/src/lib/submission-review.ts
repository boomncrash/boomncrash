import {
  getBountyById,
  getSubmissionById,
  updateBounty,
  updateSubmission,
} from "@/lib/repository";
import {
  notifySubmissionApproved,
  notifySubmissionRejected,
  notifySubmissionPaid,
} from "@/lib/notifications";

export async function applySubmissionReview(
  submissionId: string,
  status: "approved" | "rejected",
  reviewNotes?: string
) {
  const submission = await getSubmissionById(submissionId);
  if (!submission) return { error: "Submission not found" as const };

  if (submission.status !== "pending") {
    return { error: "Only pending submissions can be reviewed" as const };
  }

  const bounty = await getBountyById(submission.bountyId);
  if (!bounty) return { error: "Bounty not found" as const };

  await updateSubmission(submissionId, {
    status,
    reviewNotes,
  });

  if (status === "approved") {
    const needsOnChainPayout =
      (bounty.chain === "base" || bounty.chain === "solana") && !!bounty.escrowAddress;

    if (needsOnChainPayout) {
      await updateBounty(submission.bountyId, { status: "approved" });
      await notifySubmissionApproved(
        submission.hunterAddress,
        bounty.id,
        bounty.title
      );
    } else {
      await updateBounty(submission.bountyId, { status: "paid" });
      await updateSubmission(submissionId, { status: "paid" });
      await notifySubmissionApproved(
        submission.hunterAddress,
        bounty.id,
        bounty.title
      );
      await notifySubmissionPaid(
        submission.hunterAddress,
        bounty.id,
        bounty.title,
        bounty.rewardUsdc
      );
    }
  }

  if (status === "rejected") {
    if (bounty.status === "submitted") {
      await updateBounty(submission.bountyId, { status: "open" });
    }
    await notifySubmissionRejected(
      submission.hunterAddress,
      bounty.id,
      bounty.title
    );
  }

  const updated = await getSubmissionById(submissionId);
  return { submission: updated! };
}

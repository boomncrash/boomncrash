import { APP_NAME } from "@/lib/constants";
import type { NotificationType } from "@/lib/types";
import { getEmailPreferences, getUnsubscribeToken } from "@/lib/repository";
import { emailFooterHtml } from "@/lib/email-footer";

const RESEND_API = "https://api.resend.com/emails";

type EmailCategory = "submissions" | "reviews" | "payouts" | "rally" | "new_bounties";

const TYPE_TO_CATEGORY: Partial<Record<NotificationType, EmailCategory>> = {
  submission_received: "submissions",
  submission_approved: "reviews",
  submission_rejected: "reviews",
  submission_paid: "payouts",
  rally_milestone: "rally",
  rally_funded: "rally",
  bounty_open: "reviews",
  bounty_available: "new_bounties",
};

function categoryEnabled(
  prefs: Awaited<ReturnType<typeof getEmailPreferences>>,
  category: EmailCategory
): boolean {
  if (!prefs?.enabled) return false;
  switch (category) {
    case "submissions":
      return prefs.notifySubmissions;
    case "reviews":
      return prefs.notifyReviews;
    case "payouts":
      return prefs.notifyPayouts;
    case "rally":
      return prefs.notifyRally;
    case "new_bounties":
      return prefs.notifyNewBounties;
    default:
      return false;
  }
}

export async function sendUserNotificationEmail(params: {
  walletAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const category = TYPE_TO_CATEGORY[params.type];
  if (!category) return;

  const prefs = await getEmailPreferences(params.walletAddress);
  if (!prefs?.email || !prefs.emailVerified || !categoryEnabled(prefs, category)) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = params.link ? `${appUrl}${params.link}` : appUrl;
  const unsubscribeToken = await getUnsubscribeToken(params.walletAddress);

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`,
        to: [prefs.email],
        subject: `[${APP_NAME}] ${params.title}`,
        html: `<p>${params.message}</p><p><a href="${link}">Open in ${APP_NAME}</a></p>${emailFooterHtml(unsubscribeToken)}`,
      }),
    });

    if (!res.ok) {
      console.error("User email failed:", await res.text());
    }
  } catch (err) {
    console.error("User email error:", err);
  }
}

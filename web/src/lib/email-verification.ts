import { generateId } from "@/lib/utils";
import { getEmailPreferences, upsertEmailPreferences, refreshVerificationToken } from "@/lib/repository";
import { emailFooterHtml } from "@/lib/email-footer";

const RESEND_API = "https://api.resend.com/emails";
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function createVerifyToken(): { token: string; expiresAt: Date } {
  return {
    token: generateId(),
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
  };
}

export async function sendVerificationEmail(
  walletAddress: string,
  email: string,
  token: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Bountly <onboarding@resend.dev>",
        to: [email],
        subject: "[Bountly] Verify your email",
        html: `<p>Confirm your email to receive Bountly alerts.</p>
               <p><a href="${verifyUrl}">Verify email address</a></p>
               <p>This link expires in 24 hours.</p>
               ${emailFooterHtml()}`,
      }),
    });

    if (!res.ok) {
      console.error("Verification email failed:", await res.text());
    }
  } catch (err) {
    console.error("Verification email error:", err);
  }
}

export async function issueEmailVerification(
  walletAddress: string,
  email: string,
  prefs: {
    enabled: boolean;
    notifySubmissions: boolean;
    notifyReviews: boolean;
    notifyPayouts: boolean;
    notifyRally: boolean;
    notifyNewBounties: boolean;
  },
  emailChanged: boolean
): Promise<{ preferences: Awaited<ReturnType<typeof upsertEmailPreferences>>; verificationSent: boolean }> {
  const existing = await getEmailPreferences(walletAddress);
  const keepVerified = existing && !emailChanged && existing.emailVerified;

  if (keepVerified) {
    const preferences = await upsertEmailPreferences({
      walletAddress,
      email,
      emailVerified: true,
      ...prefs,
    });
    return { preferences, verificationSent: false };
  }

  const { token, expiresAt } = createVerifyToken();
  const preferences = await upsertEmailPreferences({
    walletAddress,
    email,
    emailVerified: false,
    verifyToken: token,
    verifyTokenExpires: expiresAt.toISOString(),
    ...prefs,
  });

  void sendVerificationEmail(walletAddress, email, token);
  return { preferences, verificationSent: true };
}

export async function resendVerificationEmail(
  walletAddress: string
): Promise<{ sent: boolean; error?: string }> {
  const refreshed = await refreshVerificationToken(walletAddress);
  if (!refreshed) {
    return { sent: false, error: "No pending email to verify" };
  }
  await sendVerificationEmail(walletAddress, refreshed.email, refreshed.token);
  return { sent: true };
}

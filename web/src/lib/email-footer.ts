import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export function emailFooterHtml(unsubscribeToken?: string | null): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const unsubscribe = unsubscribeToken
    ? `<p style="margin-top:24px;font-size:12px;color:#888;">
         <a href="${appUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}">Unsubscribe from emails</a>
       </p>`
    : "";
  return `${unsubscribe}<p style="font-size:12px;color:#888;">${APP_NAME} — ${APP_TAGLINE}</p>`;
}

export function emailFooterText(unsubscribeToken?: string | null): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const line = unsubscribeToken
    ? `\n\nUnsubscribe: ${appUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    : "";
  return `${line}\n\n${APP_NAME} — ${APP_TAGLINE}`;
}

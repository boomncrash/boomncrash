const RESEND_API = "https://api.resend.com/emails";

export async function sendAdminAlert(subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_ALERT_EMAIL;

  if (!apiKey || !to) return;

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Bountly <onboarding@resend.dev>",
        to: [to],
        subject: `[Bountly] ${subject}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Admin email failed:", await res.text());
    }
  } catch (err) {
    console.error("Admin email error:", err);
  }
}

export async function alertNewBounty(title: string, rewardUsdc: number, chain: string) {
  await sendAdminAlert(
    `New bounty: ${title}`,
    `<p>A new bounty was posted and needs review.</p>
     <ul>
       <li><strong>Title:</strong> ${title}</li>
       <li><strong>Reward:</strong> $${rewardUsdc} USDC</li>
       <li><strong>Chain:</strong> ${chain}</li>
     </ul>
     <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin">Open admin queue</a></p>`
  );
}

export async function alertRallyFunded(title: string, rewardUsdc: number) {
  await sendAdminAlert(
    `Rally fully funded: ${title}`,
    `<p>A Rally bounty hit 100% funding and is ready for moderation.</p>
     <ul>
       <li><strong>Title:</strong> ${title}</li>
       <li><strong>Target:</strong> $${rewardUsdc} USDC</li>
     </ul>
     <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin">Open admin queue</a></p>`
  );
}

export async function alertNewDispute(title: string, bountyId: string, reason: string) {
  await sendAdminAlert(
    `Dispute filed: ${title}`,
    `<p>A dispute was filed on an approved bounty.</p>
     <p><strong>Reason:</strong> ${reason}</p>
     <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin">Review in admin</a></p>
     <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/bounty/${bountyId}">View bounty</a></p>`
  );
}

export async function alertNewSubmission(bountyTitle: string, bountyId: string) {
  await sendAdminAlert(
    `New submission: ${bountyTitle}`,
    `<p>A hunter submitted proof for review.</p>
     <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/bounty/${bountyId}">View bounty</a></p>`
  );
}

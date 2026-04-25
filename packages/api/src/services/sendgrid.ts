// SendGrid v3 mail/send wrapper. We send newsletters individually (one
// API call per recipient) so each subscriber gets a unique unsubscribe
// link. Up to ~1k subscribers per newsletter run is well under SendGrid's
// rate limits; if a user grows past that we'll switch to personalisations
// (multiple recipients per call) or move to a queued worker.

const ENDPOINT = "https://api.sendgrid.com/v3/mail/send";

export type SendgridSendArgs = {
  to: { email: string; name?: string };
  from: { email: string; name: string };
  replyTo?: { email: string; name?: string };
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl?: string;
  categories?: string[]; // for SendGrid analytics
};

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WEB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.adfi.ca")
  );
}

export function newsletterFromEmail(): string {
  return process.env.NEWSLETTER_FROM_EMAIL ?? "newsletters@adfi.ca";
}

export async function sendgridSend(args: SendgridSendArgs): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not set");
  }

  const personalizations: Record<string, unknown>[] = [
    {
      to: [args.to],
      subject: args.subject,
    },
  ];

  const headers: Record<string, string> = {};
  if (args.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${args.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const body = {
    personalizations,
    from: args.from,
    ...(args.replyTo && { reply_to: args.replyTo }),
    content: [
      { type: "text/plain", value: args.text },
      { type: "text/html", value: args.html },
    ],
    ...(Object.keys(headers).length > 0 && { headers }),
    ...(args.categories && { categories: args.categories }),
    tracking_settings: {
      click_tracking: { enable: true, enable_text: false },
      open_tracking: { enable: true },
    },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `SendGrid send failed (${res.status} ${res.statusText}): ${errorBody.slice(0, 300)}`,
    );
  }
}

export function unsubscribeUrlFor(token: string): string {
  return `${appUrl()}/unsubscribe?token=${token}`;
}

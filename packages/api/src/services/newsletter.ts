import { db, Agent, Platform, type Prisma } from "@orb/db";
import {
  newsletterFromEmail,
  sendgridSend,
  unsubscribeUrlFor,
} from "./sendgrid";

type EmailContent = {
  subject?: string;
  preheader?: string;
  sections?: { heading: string | null; body: string }[];
  cta?: { label: string; intent: string; link: string | null };
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphsToHtml(body: string): string {
  return body
    .split(/\n\n+/)
    .map((p) => `<p style="margin: 0 0 16px; line-height: 1.6;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function renderNewsletterHtml(
  content: EmailContent,
  args: { senderName: string; unsubscribeUrl: string },
): { html: string; text: string } {
  const sections = content.sections ?? [];
  const bodyHtml = sections
    .map((s) => {
      const heading = s.heading
        ? `<h2 style="font-size: 18px; font-weight: 500; margin: 0 0 12px; color: #111;">${escapeHtml(s.heading)}</h2>`
        : "";
      return `${heading}${paragraphsToHtml(s.body)}`;
    })
    .join('<div style="height: 12px"></div>');

  const ctaHtml = content.cta
    ? `<div style="margin: 24px 0;">
         <a href="${escapeHtml(content.cta.link ?? "#")}" style="display: inline-block; background: #111; color: #fff; padding: 12px 22px; border-radius: 100px; text-decoration: none; font-size: 14px; font-weight: 500;">
           ${escapeHtml(content.cta.label)}
         </a>
       </div>`
    : "";

  const preheader = content.preheader
    ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(content.preheader)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(content.subject ?? "")}</title></head>
<body style="margin: 0; padding: 0; background: #FAFAF7;">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #FAFAF7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border: 0.5px solid #E5E3DB; border-radius: 16px;">
          <tr>
            <td style="padding: 32px; font-family: -apple-system, 'SF Pro Text', system-ui, sans-serif; color: #111; font-size: 15px; line-height: 1.6;">
              ${bodyHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 32px; font-family: 'SF Mono', monospace; font-size: 11px; color: #888; text-align: center;">
              <div style="margin-bottom: 8px;">${escapeHtml(args.senderName)}</div>
              <div>
                <a href="${args.unsubscribeUrl}" style="color: #888; text-decoration: underline;">unsubscribe</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body></html>`;

  // Plain-text version for clients that don't render HTML.
  const textParts: string[] = [];
  for (const s of sections) {
    if (s.heading) textParts.push(s.heading.toUpperCase(), "");
    textParts.push(s.body, "");
  }
  if (content.cta) {
    textParts.push(`${content.cta.label}${content.cta.link ? `: ${content.cta.link}` : ""}`, "");
  }
  textParts.push("---", `from ${args.senderName}`, `unsubscribe: ${args.unsubscribeUrl}`);

  return { html, text: textParts.join("\n") };
}

export async function publishNewsletter(args: {
  draftId: string;
  userId: string;
}): Promise<{
  sent: number;
  failed: number;
  failures: { email: string; error: string }[];
}> {
  const draft = await db.contentDraft.findFirst({
    where: { id: args.draftId, userId: args.userId },
    include: { user: true },
  });
  if (!draft) throw new Error("Draft not found");
  if (draft.platform !== Platform.EMAIL) {
    throw new Error("Draft is not an email newsletter");
  }

  const content = (draft.content ?? {}) as EmailContent;
  if (!content.subject || !content.sections || content.sections.length === 0) {
    throw new Error("Newsletter draft is missing subject or sections");
  }

  const subscribers = await db.subscriber.findMany({
    where: { userId: args.userId, status: "ACTIVE" },
    select: { id: true, email: true, name: true, unsubscribeToken: true },
  });
  if (subscribers.length === 0) {
    throw new Error("No active subscribers — add some before publishing");
  }

  const senderName =
    draft.user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 40)?.trim() ||
    "ADFI";
  const fromEmail = newsletterFromEmail();
  const fromAddr = { email: fromEmail, name: senderName };
  const replyTo = draft.user.email
    ? { email: draft.user.email, name: senderName }
    : undefined;

  let sent = 0;
  let failed = 0;
  const failures: { email: string; error: string }[] = [];

  for (const sub of subscribers) {
    const unsubUrl = unsubscribeUrlFor(sub.unsubscribeToken);
    const { html, text } = renderNewsletterHtml(content, {
      senderName,
      unsubscribeUrl: unsubUrl,
    });
    try {
      await sendgridSend({
        to: { email: sub.email, ...(sub.name && { name: sub.name }) },
        from: fromAddr,
        ...(replyTo && { replyTo }),
        subject: content.subject,
        text,
        html,
        unsubscribeUrl: unsubUrl,
        categories: ["newsletter", `user-${args.userId.slice(0, 8)}`],
      });
      sent++;
    } catch (err) {
      failed++;
      failures.push({
        email: sub.email,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Persist a ContentPost record so this counts toward performance metrics
  // (reach is set to subscriber count delivered for now — opens/clicks
  // would need SendGrid event webhook integration later).
  const externalId = `newsletter-${draft.id}-${Date.now()}`;
  await db.contentPost.create({
    data: {
      userId: args.userId,
      draftId: draft.id,
      platform: Platform.EMAIL,
      externalId,
      publishedAt: new Date(),
      metrics: {
        recipients: subscribers.length,
        sent,
        failed,
        reach: sent,
      } as Prisma.InputJsonValue,
    },
  });

  await db.contentDraft.update({
    where: { id: draft.id },
    data: { status: "PUBLISHED" },
  });

  await db.agentEvent.create({
    data: {
      userId: args.userId,
      agent: Agent.ECHO,
      eventType: "newsletter_sent",
      payload: {
        draftId: draft.id,
        sent,
        failed,
        recipients: subscribers.length,
      },
    },
  });

  return { sent, failed, failures };
}

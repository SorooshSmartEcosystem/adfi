import { db, Agent, Platform, type Prisma } from "@orb/db";
import { CREDIT_COSTS, consumeCredits } from "./quota";
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
  heroImage?: { url: string; model?: string } | null;
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
  args: {
    senderName: string;
    unsubscribeUrl: string;
    // Business branding — surfaces in the header (logo + name) and the
    // CTA fallback link (websiteUrl) so the email looks like it's from
    // the user's business, not from adfi.
    businessName?: string | null;
    businessLogoUrl?: string | null;
    businessWebsiteUrl?: string | null;
    ownerEmail?: string | null;
  },
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

  // CTA fallback chain: explicit link → owner's website → owner's email
  // (mailto:) → "#" (last resort, but logged on the server).
  const ctaFallback =
    args.businessWebsiteUrl ??
    (args.ownerEmail ? `mailto:${args.ownerEmail}` : "#");
  const ctaHref = content.cta?.link?.trim() || ctaFallback;
  const ctaHtml = content.cta
    ? `<div style="margin: 24px 0;">
         <a href="${escapeHtml(ctaHref)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 22px; border-radius: 100px; text-decoration: none; font-size: 14px; font-weight: 500;">
           ${escapeHtml(content.cta.label)}
         </a>
       </div>`
    : "";

  const preheader = content.preheader
    ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(content.preheader)}</div>`
    : "";

  // Header now shows the BUSINESS branding, not adfi. Logo (if uploaded)
  // takes the orb's place; the wordmark is the business name. ADFI gets a
  // tiny "made with adfi" line in the footer.
  const headerName = args.businessName?.trim() || args.senderName;
  const headerLogo = args.businessLogoUrl
    ? `<img src="${escapeHtml(args.businessLogoUrl)}" alt="" width="28" height="28" style="width: 28px; height: 28px; border-radius: 50%; display: block; object-fit: cover;" />`
    : `<div style="width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle at 30% 25%, #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%);"></div>`;
  const headerHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="left" style="padding: 28px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="padding-right: 12px;">${headerLogo}</td>
              <td valign="middle" style="font-family: -apple-system, 'SF Pro Text', system-ui, sans-serif; font-size: 16px; font-weight: 500; color: #111; letter-spacing: -0.01em;">
                ${escapeHtml(headerName)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  // Footer attributes ADFI without overshadowing the business. Single line,
  // small, with the orb mark next to a soft tagline.
  const adfiFooter = `
    <div style="display: inline-flex; align-items: center; gap: 6px; color: #aaa; letter-spacing: 0.04em;">
      <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: radial-gradient(circle at 30% 25%, #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%); vertical-align: middle;"></span>
      <span style="vertical-align: middle;">made with <a href="https://www.adfi.ca" style="color: #888; text-decoration: none;">adfi</a> — the ai marketing team for solopreneurs</span>
    </div>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(content.subject ?? "")}</title></head>
<body style="margin: 0; padding: 0; background: #FAFAF7;">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #FAFAF7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border: 0.5px solid #E5E3DB; border-radius: 16px;">
          <tr><td>${headerHtml}</td></tr>
          ${
            content.heroImage?.url
              ? `<tr><td style="padding: 16px 32px 0;"><img src="${escapeHtml(content.heroImage.url)}" alt="" width="536" style="width: 100%; max-width: 536px; height: auto; display: block; border-radius: 10px;" /></td></tr>`
              : ""
          }
          <tr>
            <td style="padding: 16px 32px 32px; font-family: -apple-system, 'SF Pro Text', system-ui, sans-serif; color: #111; font-size: 15px; line-height: 1.6;">
              ${bodyHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 28px; border-top: 0.5px solid #E5E3DB; font-family: 'SF Mono', 'Courier New', monospace; font-size: 11px; color: #888; text-align: center;">
              <div style="margin-bottom: 8px; color: #111;">${escapeHtml(headerName)}</div>
              <div style="margin-bottom: 12px;">
                <a href="${args.unsubscribeUrl}" style="color: #888; text-decoration: underline;">unsubscribe</a>
              </div>
              ${adfiFooter}
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

// Send the newsletter to a single recipient (the owner's own email) so they
// can preview it in their inbox before approving for the list. No credits
// charged, no ContentPost recorded.
export async function testSendNewsletter(args: {
  draftId: string;
  userId: string;
}): Promise<{ ok: true; sentTo: string }> {
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
  const recipient = draft.user.email;
  if (!recipient) throw new Error("No owner email on record");

  const businessName =
    draft.user.businessName?.trim() ||
    draft.user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 40)?.trim() ||
    null;
  const senderName = businessName ?? "ADFI";
  const fromAddr = { email: newsletterFromEmail(), name: senderName };
  // Test sends use a synthetic unsubscribe token so the link still renders
  // but isn't tied to a real subscriber row.
  const unsubUrl = unsubscribeUrlFor("test-preview");
  const { html, text } = renderNewsletterHtml(content, {
    senderName,
    unsubscribeUrl: unsubUrl,
    businessName,
    businessLogoUrl: draft.user.businessLogoUrl,
    businessWebsiteUrl: draft.user.businessWebsiteUrl,
    ownerEmail: draft.user.email,
  });
  // Subject prefixed with business name so the inbox preview makes the
  // sender obvious. Skip the prefix if the user already wrote the
  // business name into the subject (avoid stutter).
  const subjectLine =
    businessName && !content.subject.toLowerCase().includes(businessName.toLowerCase())
      ? `${businessName} · ${content.subject}`
      : content.subject;
  await sendgridSend({
    to: { email: recipient },
    from: fromAddr,
    subject: `[test] ${subjectLine}`,
    text,
    html,
    unsubscribeUrl: unsubUrl,
    categories: ["newsletter-test"],
  });
  return { ok: true, sentTo: recipient };
}

export async function publishNewsletter(args: {
  draftId: string;
  userId: string;
  businessId?: string | null;
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
    throw new Error(
      "no subscribers yet — add some on /settings → newsletter list before sending",
    );
  }

  // 1 credit per 100 recipients, rounded up. Min 1.
  const creditCost = Math.max(
    CREDIT_COSTS.NEWSLETTER_PER_100,
    Math.ceil(subscribers.length / 100) * CREDIT_COSTS.NEWSLETTER_PER_100,
  );
  await consumeCredits(args.userId, creditCost, "newsletter_send");

  const businessName =
    draft.user.businessName?.trim() ||
    draft.user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 40)?.trim() ||
    null;
  const senderName = businessName ?? "ADFI";
  const fromEmail = newsletterFromEmail();
  const fromAddr = { email: fromEmail, name: senderName };
  const replyTo = draft.user.email
    ? { email: draft.user.email, name: senderName }
    : undefined;
  // Subject prefix so subscribers see the business name in their inbox
  // preview (avoiding stutter if it's already in the subject).
  const subjectLine =
    businessName &&
    !content.subject.toLowerCase().includes(businessName.toLowerCase())
      ? `${businessName} · ${content.subject}`
      : content.subject;

  let sent = 0;
  let failed = 0;
  const failures: { email: string; error: string }[] = [];

  for (const sub of subscribers) {
    const unsubUrl = unsubscribeUrlFor(sub.unsubscribeToken);
    const { html, text } = renderNewsletterHtml(content, {
      senderName,
      unsubscribeUrl: unsubUrl,
      businessName,
      businessLogoUrl: draft.user.businessLogoUrl,
      businessWebsiteUrl: draft.user.businessWebsiteUrl,
      ownerEmail: draft.user.email,
    });
    try {
      await sendgridSend({
        to: { email: sub.email, ...(sub.name && { name: sub.name }) },
        from: fromAddr,
        ...(replyTo && { replyTo }),
        subject: subjectLine,
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
      businessId: args.businessId ?? null,
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

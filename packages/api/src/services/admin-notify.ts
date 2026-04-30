// Send a detailed error to the admin email list via SendGrid. Used when an
// external API fails with a message that's too revealing or noisy to show
// to end users (rate limits, billing warnings, raw stack traces, etc.).
//
// User-facing code calls `notifyAdminOfError` and surfaces a friendly,
// generic message via OrbError.EXTERNAL_API. Admins see the full detail in
// their inbox + the server console.
//
// Best-effort: if SendGrid is unavailable, we log + continue rather than
// turning a recoverable bug into a hard failure.

import { newsletterFromEmail, sendgridSend } from "./sendgrid";

function adminRecipients(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Detects errors that imply a third-party service is down or in a
// billing/quota failure mode. We promote these to URGENT in the email
// subject so admins notice them in their inbox among normal error
// reports — they need human action (top up account, switch provider,
// pause feature) and an outage stays visible until resolved.
const URGENT_PATTERNS: Array<{ tag: string; rx: RegExp }> = [
  // Anthropic / OpenAI billing
  { tag: "anthropic-billing", rx: /credit balance is too low/i },
  { tag: "openai-billing", rx: /you exceeded your current quota/i },
  { tag: "billing", rx: /insufficient.*(funds|balance|credits)/i },
  { tag: "billing", rx: /payment required|402/i },
  // Generic rate-limit / throttling at the provider level. We swallow
  // app-level rate limits before this point — anything that reaches
  // here is the upstream provider rejecting us, which is also urgent.
  { tag: "rate-limit", rx: /rate.?limit.*(exceeded|hit)|too many requests/i },
  // Provider-level outage / degradation
  { tag: "service-down", rx: /service unavailable|503|gateway timeout|504/i },
  { tag: "service-down", rx: /upstream.*(connect|timeout|reset)/i },
  // Twilio account suspended / number issues
  { tag: "twilio-account", rx: /account.*(suspended|inactive)|20003/i },
  // Stripe outage
  { tag: "stripe-down", rx: /stripe.*(unavailable|down|cannot connect)/i },
];

function detectUrgency(error: unknown): { urgent: boolean; tags: string[] } {
  const msg = error instanceof Error ? error.message : String(error);
  const tags: string[] = [];
  for (const { tag, rx } of URGENT_PATTERNS) {
    if (rx.test(msg) && !tags.includes(tag)) tags.push(tag);
  }
  return { urgent: tags.length > 0, tags };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type AdminErrorContext = {
  // Short slug — surfaces in subject + groups errors in admin inbox.
  source: string;
  // The raw error object, message string, or response body.
  error: unknown;
  // Optional structured context (userId, draftId, plan, etc.).
  meta?: Record<string, unknown>;
};

export async function notifyAdminOfError(
  ctx: AdminErrorContext,
): Promise<void> {
  // Always log to the server so failed deliveries don't lose the trail.
  console.error(`[admin-notify] ${ctx.source}:`, ctx.error, ctx.meta ?? {});

  const recipients = adminRecipients();
  if (recipients.length === 0) return;
  if (!process.env.SENDGRID_API_KEY) return;

  const errMessage =
    ctx.error instanceof Error ? ctx.error.message : String(ctx.error);
  const errStack = ctx.error instanceof Error ? ctx.error.stack ?? "" : "";

  const summary = errMessage.slice(0, 100);
  const { urgent, tags } = detectUrgency(ctx.error);
  const subject = urgent
    ? `[adfi · URGENT · ${tags.join(" + ")}] ${ctx.source}: ${summary}`
    : `[adfi error] ${ctx.source}: ${summary}`;

  const metaHtml = ctx.meta
    ? `<h3 style="font-size:13px;color:#666;margin:16px 0 6px;">context</h3>
       <pre style="background:#f5f5f0;padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;line-height:1.5;">${escapeHtml(
         JSON.stringify(ctx.meta, null, 2),
       )}</pre>`
    : "";

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,system-ui,sans-serif;background:#fafaf7;margin:0;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e3db;border-radius:12px;padding:24px;">
      <div style="font-size:11px;color:#888;letter-spacing:0.08em;margin-bottom:8px;">ADFI · ERROR REPORT</div>
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">${escapeHtml(ctx.source)}</h2>
      <h3 style="font-size:13px;color:#666;margin:16px 0 6px;">message</h3>
      <pre style="background:#fafaf7;padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;line-height:1.5;color:#b00020;white-space:pre-wrap;word-break:break-word;">${escapeHtml(errMessage)}</pre>
      ${metaHtml}
      ${
        errStack
          ? `<h3 style="font-size:13px;color:#666;margin:16px 0 6px;">stack</h3>
             <pre style="background:#fafaf7;padding:12px;border-radius:6px;overflow-x:auto;font-size:11px;line-height:1.5;color:#444;white-space:pre-wrap;word-break:break-word;">${escapeHtml(errStack.slice(0, 2000))}</pre>`
          : ""
      }
      <div style="margin-top:24px;font-size:11px;color:#aaa;">${new Date().toISOString()}</div>
    </div>
  </body></html>`;

  const text = `ADFI ERROR REPORT
${ctx.source}

message:
${errMessage}

${ctx.meta ? `context:\n${JSON.stringify(ctx.meta, null, 2)}\n` : ""}${
    errStack ? `\nstack:\n${errStack.slice(0, 2000)}` : ""
  }

${new Date().toISOString()}`;

  for (const email of recipients) {
    try {
      await sendgridSend({
        to: { email },
        from: { email: newsletterFromEmail(), name: "adfi error reporter" },
        subject,
        text,
        html,
        categories: [
          "admin-error",
          `source-${ctx.source}`,
          ...(urgent ? ["urgent", ...tags.map((t) => `urgent-${t}`)] : []),
        ],
      });
    } catch (err) {
      console.error(
        `[admin-notify] failed to deliver report to ${email}:`,
        err,
      );
    }
  }
}

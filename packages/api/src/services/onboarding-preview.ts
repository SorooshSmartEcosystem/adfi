// Generates a one-shot "wow" demo for the unauthenticated onboarding screen:
// brand voice tokens + a single Instagram post + a hero photo. Runs Strategist
// (no userId → no agentContext write) → Echo SINGLE_POST → Replicate Flux
// Schnell, then persists the result on OnboardingPreview so:
//   - we can rate-limit by ip-hash (5/day)
//   - 'save for later' attaches an email and a resume token
//   - signed-in conversions can backfill convertedUserId
//
// Cost: ~5¢ Anthropic + ~1¢ Replicate per call. Keep this gated.

import { createHash, randomBytes } from "node:crypto";
import { db } from "@orb/db";
import { runStrategist, type BrandVoice } from "../agents/strategist";
import {
  runVideoAgent,
  backfillImagesForVideoScript,
  type VideoScript,
} from "../agents/video";
import { newsletterFromEmail, sendgridSend } from "./sendgrid";

const PREVIEW_USER_ID_PLACEHOLDER = "preview";
const RATE_LIMIT_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

// Onboarding preview result. Shape changed 2026-05-08 — swap from
// single Instagram post + hero image → a free-preview reel script
// the wow page renders in-browser via Remotion <Player>. Same cost
// (~3-4¢/call) but matches the product's current centerpiece. The
// `post` field is preserved as null + an optional fallback for
// saved previews from the old flow that haven't been resumed yet.
export type OnboardingPreviewResult = {
  voice: { tone: string[]; pillars: string[] };
  // The reel script. The client passes it to <Player> + applyPresetTokens
  // for an in-browser preview at zero cost. Lambda render only happens
  // post-signup if the user explicitly clicks "render mp4."
  videoScript: VideoScript | null;
  // Headline pulled from the script for save-for-later email subject /
  // teaser display.
  videoHeadline: string | null;
  // Legacy single-post fields. Kept so saved previews from before the
  // 2026-05-08 swap still resume cleanly. New previews leave these null.
  post: {
    hook: string;
    body: string;
    cta: string | null;
    hashtags: string[];
    visualDirection: string;
  } | null;
  imageUrl: string | null;
  // Returned to the client so 'save for later' knows which preview to attach
  // an email to. Also serves as the magic-link token for resume.
  resumeToken: string;
};

export class RateLimitError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "RateLimitError";
  }
}

function hashIp(ip: string): string {
  // Salted hash so the raw ip never lands in the database.
  const salt = process.env.PREVIEW_IP_SALT ?? "adfi-preview-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function newResumeToken(): string {
  // 24 url-safe chars, ~144 bits of entropy. Used as the public path segment
  // and as a unique key on OnboardingPreview.
  return randomBytes(18).toString("base64url");
}

export async function checkPreviewRateLimit(ipHash: string): Promise<void> {
  const since = new Date(Date.now() - DAY_MS);
  const recent = await db.onboardingPreview.count({
    where: { ipHash, createdAt: { gte: since } },
  });
  if (recent >= RATE_LIMIT_PER_DAY) {
    throw new RateLimitError(
      `Too many previews from this address — try again tomorrow, or sign up to keep going.`,
    );
  }
}

export async function runOnboardingPreview(args: {
  businessDescription: string;
  ip: string;
}): Promise<OnboardingPreviewResult> {
  const description = args.businessDescription.trim();
  if (description.length < 10) {
    throw new Error("Tell me a little more about your business — one sentence.");
  }
  if (description.length > 500) {
    throw new Error("Keep it under 500 characters — i'll figure out the rest.");
  }

  const ipHash = hashIp(args.ip);
  await checkPreviewRateLimit(ipHash);

  const resumeToken = newResumeToken();

  // 1. Brand voice — full Strategist run, no DB persistence (no userId).
  const voice: BrandVoice = await runStrategist({
    businessDescription: description,
    goal: "MORE_CUSTOMERS",
  });

  // 2. Video script — runVideoAgent (Haiku ~0.4¢ with cache). The
  // brief is the business description itself; agent infers narrative
  // arc, picks scenes, fills copy. No userId → no draft row, no
  // motion state persisted.
  const script = await runVideoAgent({
    brief: description,
    brandVoice: voice,
    industry: description,
    userId: PREVIEW_USER_ID_PLACEHOLDER,
  });

  // 3. Photo backfill — fills hero-photo / split-frame scenes with
  // Replicate-generated images. Best-effort: if Replicate fails the
  // scene falls back to a solid frame in the renderer. Cost ~0.3¢
  // per image, ~1 image per script today.
  const filledScript = await backfillImagesForVideoScript({
    script,
    userId: PREVIEW_USER_ID_PLACEHOLDER,
    draftId: resumeToken,
  }).catch((err) => {
    console.warn(
      "[onboarding-preview] image backfill failed; serving solid-frame fallback:",
      err instanceof Error ? err.message : err,
    );
    return script;
  });

  // Pull a headline from the first scene that has one — used in the
  // save-for-later email subject + the resume page teaser.
  const firstHeadlineScene = filledScript.scenes.find(
    (s): s is typeof s & { headline: string } =>
      "headline" in s && typeof (s as { headline?: string }).headline === "string",
  );
  const videoHeadline = firstHeadlineScene?.headline ?? null;

  const result: OnboardingPreviewResult = {
    voice: {
      tone: voice.voiceTone,
      pillars: voice.contentPillars,
    },
    videoScript: filledScript,
    videoHeadline,
    post: null,
    imageUrl: null,
    resumeToken,
  };

  await db.onboardingPreview.create({
    data: {
      ipHash,
      resumeToken,
      businessDescription: description,
      result: result as unknown as object,
    },
  });

  return result;
}

export async function attachEmailToPreview(args: {
  resumeToken: string;
  email: string;
}): Promise<{ ok: true; resumeUrl: string }> {
  const email = args.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("That doesn't look like an email — check the spelling.");
  }

  const preview = await db.onboardingPreview.findUnique({
    where: { resumeToken: args.resumeToken },
  });
  if (!preview) throw new Error("preview not found — try generating a new one.");

  await db.onboardingPreview.update({
    where: { resumeToken: args.resumeToken },
    data: { email, savedAt: new Date() },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL ??
    `https://${process.env.VERCEL_URL ?? "www.adfi.ca"}`;
  const resumeUrl = `${baseUrl}/onboarding/wow/saved/${args.resumeToken}`;

  // Best-effort send. If SendGrid isn't configured (dev) the function logs
  // and returns; the resume link still goes back to the client so the user
  // can bookmark it manually.
  try {
    await sendgridSend({
      to: { email },
      from: { email: newsletterFromEmail(), name: "adfi" },
      subject: "your post is waiting at adfi.",
      text:
        `here's the link to come back to the post i wrote for you:\n${resumeUrl}\n\n— adfi`,
      html: previewSavedHtml({ resumeUrl }),
      categories: ["onboarding-saved"],
    });
  } catch (err) {
    console.warn("preview save email failed:", err);
  }

  return { ok: true, resumeUrl };
}

function previewSavedHtml(args: { resumeUrl: string }): string {
  const url = args.resumeUrl.replace(/&/g, "&amp;");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>your post is waiting at adfi</title></head>
<body style="margin:0;padding:0;background:#FAFAF7;font-family:-apple-system,'SF Pro Text',system-ui,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF7;">
    <tr><td align="center" style="padding:48px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border:0.5px solid #E5E3DB;border-radius:16px;">
        <tr><td style="padding:32px 36px 8px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="padding-right:10px;">
                <div style="width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 30% 25%, #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%);"></div>
              </td>
              <td valign="middle" style="font-size:15px;font-weight:500;color:#111;letter-spacing:-0.01em;">adfi</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 36px 28px;font-size:15px;line-height:1.6;color:#111;">
          <p style="margin:0 0 14px;font-size:22px;font-weight:500;letter-spacing:-0.02em;line-height:1.2;">your post is waiting.</p>
          <p style="margin:0 0 22px;color:#666;">come back to the post i wrote for you. i'll keep this saved for 30 days.</p>
          <a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 22px;border-radius:100px;text-decoration:none;font-size:14px;font-weight:500;">open my post</a>
        </td></tr>
        <tr><td style="padding:14px 36px 28px;border-top:0.5px solid #E5E3DB;font-size:11px;color:#888;text-align:center;letter-spacing:0.05em;">
          made for solopreneurs · adfi.ca
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function getSavedPreview(resumeToken: string) {
  const preview = await db.onboardingPreview.findUnique({
    where: { resumeToken },
  });
  if (!preview) return null;
  return {
    businessDescription: preview.businessDescription,
    result: preview.result as unknown as OnboardingPreviewResult,
    savedAt: preview.savedAt,
    email: preview.email,
  };
}

// Re-export for callers that want to type the brand voice they pass in.
export type { BrandVoice };

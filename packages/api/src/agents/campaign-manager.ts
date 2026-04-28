// Campaign Manager — Agent.ADS. Produces a unified multi-platform paid-
// ads campaign from one owner-supplied brief. Phase 1: drafts only;
// platform pushes wire in Phase 2 (Meta) + Phase 3 (Google/YouTube).
//
// See docs/CAMPAIGN_MANAGER_DESIGN.md for the full design.

import { z } from "zod";
import { Agent, db, Prisma } from "@orb/db";
import { anthropic, MODELS, recordAnthropicUsage } from "../services/anthropic";
import { jsonSchemaForAnthropic } from "../services/anthropic";
import { generateImageSafe, type AspectRatio } from "../services/replicate";
import { CAMPAIGN_MANAGER_SYSTEM_PROMPT } from "./prompts/campaign-manager";

// ============================================================
// Output schema — what the LLM returns. Camel-cased mirror of the
// Campaign + CampaignAd shapes; the service layer translates.
// ============================================================

const PlatformEnum = z.enum(["META", "GOOGLE", "YOUTUBE", "TIKTOK"]);
const FormatEnum = z.enum(["IMAGE", "VIDEO_SCRIPT", "TEXT"]);
const GoalEnum = z.enum(["LEADS", "SALES", "TRAFFIC", "AWARENESS", "APP_INSTALLS"]);

// Per-platform creative shapes. Kept loose (passthrough) so we can
// evolve without breaking the agent's output. Strict shapes are
// enforced at the service-render layer when we push to each platform.
const ImageCreativeSchema = z.object({
  headline: z.string(),
  body: z.string(),
  cta: z.string(),
  imagePrompt: z.string(),
});
const VideoScriptCreativeSchema = z.object({
  hook: z.string(),
  shotList: z.array(z.string()),
  voiceover: z.string().nullable().optional(),
  onScreenText: z.array(z.string()).optional(),
  soundMood: z.string().nullable().optional(),
});
const TextCreativeSchema = z.object({
  headlines: z.array(z.string()),
  descriptions: z.array(z.string()),
  keywordThemes: z.array(z.string()).optional(),
});

const AdSchema = z.object({
  angle: z.string(),
  format: FormatEnum,
  creative: z.union([
    ImageCreativeSchema,
    VideoScriptCreativeSchema,
    TextCreativeSchema,
  ]),
  imagePrompt: z.string().optional(), // only IMAGE format
});

const PlatformPlanSchema = z.object({
  platform: PlatformEnum,
  budgetCents: z.number().int(),
  rationale: z.string(),
  ads: z.array(AdSchema),
});

export const CampaignManagerOutputSchema = z.object({
  name: z.string(),
  goal: GoalEnum,
  audience: z.object({
    rationale: z.string(),
    locations: z.array(z.string()),
    ageMin: z.number().int(),
    ageMax: z.number().int(),
    interests: z.array(z.string()),
    customAudienceHint: z.string().nullable().optional(),
  }),
  schedule: z.object({
    startDateOffsetDays: z.number().int(),
    durationDays: z.number().int(),
    totalBudgetCents: z.number().int(),
  }),
  platformPlan: z.array(PlatformPlanSchema),
  policy: z.object({
    flagged: z.boolean(),
    reason: z.string().nullable().optional(),
  }),
  summary: z.string(),
});

export type CampaignManagerOutput = z.infer<typeof CampaignManagerOutputSchema>;

// ============================================================
// runCampaignManager — main agent entry point.
// ============================================================

export async function runCampaignManager(args: {
  userId: string;
  businessId: string;
  brief: string;                 // owner's freeform ask
  platforms: Array<"META" | "GOOGLE" | "YOUTUBE" | "TIKTOK">;
  totalBudgetCents: number;
  durationDays: number;
}): Promise<CampaignManagerOutput> {
  // Pull the agent's grounding context: brand voice, business
  // description, recent post performance, recent findings (Scout +
  // Pulse). All of these inform the campaign reasoning.
  const [user, recentPosts, recentFindings] = await Promise.all([
    db.user.findUnique({
      where: { id: args.userId },
      include: { agentContext: true },
    }),
    db.contentPost.findMany({
      where: { businessId: args.businessId },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: { metrics: true, draft: { select: { brief: true } } },
    }),
    db.finding.findMany({
      where: {
        businessId: args.businessId,
        agent: { in: [Agent.SCOUT, Agent.PULSE] },
        acknowledged: false,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { agent: true, summary: true, payload: true },
    }),
  ]);
  if (!user) throw new Error("User not found");

  const brandVoice = user.agentContext?.strategistOutput ?? null;
  const businessDescription = user.businessDescription ?? "(not set)";

  const userMessage = `Owner's brief:
${args.brief}

Selected platforms: ${args.platforms.join(", ")}
Total budget: $${(args.totalBudgetCents / 100).toFixed(2)}
Duration: ${args.durationDays} days

Business description:
${businessDescription}

Brand voice fingerprint:
${JSON.stringify(brandVoice ?? {}, null, 2)}

Recent posts that performed (last 10):
${recentPosts.length > 0
  ? recentPosts
      .map((p, i) => {
        const m = (p.metrics ?? {}) as { reach?: number };
        const b = (p.draft.brief ?? {}) as { hookFramework?: string; pillar?: string };
        return `${i + 1}. reach=${m.reach ?? 0} pillar=${b.pillar ?? "?"} hook=${b.hookFramework ?? "?"}`;
      })
      .join("\n")
  : "(no recent posts)"}

Open Scout/Pulse findings (competitor moves + market signals):
${recentFindings.length > 0
  ? recentFindings.map((f, i) => `${i + 1}. [${f.agent}] ${f.summary}`).join("\n")
  : "(no open findings)"}

Draft the campaign.`;

  const response = await anthropic().messages.create({
    model: MODELS.OPUS,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: CAMPAIGN_MANAGER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(CampaignManagerOutputSchema),
      },
    },
  });

  void recordAnthropicUsage({
    userId: args.userId,
    agent: Agent.ADS,
    eventType: "campaign_drafted",
    response,
    meta: {
      businessId: args.businessId,
      platforms: args.platforms,
      totalBudgetCents: args.totalBudgetCents,
      durationDays: args.durationDays,
    },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error(
      `campaign manager returned no text content (stop_reason=${response.stop_reason})`,
    );
  }
  return CampaignManagerOutputSchema.parse(JSON.parse(block.text));
}

// ============================================================
// Image backfill — for IMAGE-format ads, generate the actual photos
// via Replicate Flux 1.1 Pro (sharper than Schnell; the user
// explicitly chose this for paid ads on 2026-04-28). Best-effort —
// if the Replicate call fails, leave the ad without an image and let
// the owner regenerate from the UI.
// ============================================================

export async function backfillCampaignImages(args: {
  userId: string;
  campaignId: string;
}): Promise<{ generated: number; skipped: number; totalCostCents: number }> {
  const ads = await db.campaignAd.findMany({
    where: { campaignId: args.campaignId, format: "IMAGE" },
  });

  let generated = 0;
  let skipped = 0;
  let totalCostCents = 0;

  for (const ad of ads) {
    const creative = ad.creative as { imagePrompt?: string; imageUrl?: string };
    if (!creative.imagePrompt || creative.imageUrl) {
      skipped++;
      continue;
    }
    const aspect: AspectRatio = ad.platform === "META" ? "4:5" : "1:1";
    const result = await generateImageSafe({
      userId: args.userId,
      draftId: args.campaignId, // reusing the storage layout — campaignId is unique
      slug: `campaign-${ad.id}`,
      prompt: creative.imagePrompt,
      aspectRatio: aspect,
      model: "flux-1.1-pro", // higher fidelity for paid creatives
    });
    if (!result) {
      skipped++;
      continue;
    }
    const nextCreative = { ...creative, imageUrl: result.url };
    await db.campaignAd.update({
      where: { id: ad.id },
      data: { creative: nextCreative as unknown as Prisma.InputJsonValue },
    });
    generated++;
    totalCostCents += result.costCents;
  }

  return { generated, skipped, totalCostCents };
}

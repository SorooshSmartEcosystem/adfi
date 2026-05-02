import { z } from "zod";
import {
  db,
  Agent,
  ContentFormat,
  ContentPlanItemStatus,
  DraftStatus,
  Platform,
  Prisma,
} from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "../services/anthropic";
import {
  performanceForPrompt,
  summarizePerformance,
  type PerformanceSummary,
} from "../services/performance";
import { CREDIT_COSTS, consumeCredits } from "../services/quota";
import { generateImageSafe, type AspectRatio } from "../services/replicate";
import { gatherFreshContext, shouldResearch } from "../services/research";
import { ECHO_SYSTEM_PROMPT } from "./prompts/echo";
import { languageLockDirective } from "./language";

// =============================================================
// Schemas — one per ContentFormat, plus shared brief metadata.
// =============================================================

const HookFramework = z.enum([
  "open_loop",
  "pattern_interrupt",
  "specific_anecdote",
  "contrarian",
  "before_after",
  "list_promise",
  "behind_the_scenes",
]);

const Intent = z.enum([
  "build_trust",
  "drive_inquiry",
  "drive_sale",
  "build_authority",
  "build_community",
]);

const BriefShape = z.object({
  intent: Intent,
  audience: z.string(),
  pillar: z.string(),
  hookFramework: HookFramework,
});

const SinglePostShape = z.object({
  format: z.literal("SINGLE_POST"),
  hook: z.string(),
  body: z.string(),
  cta: z.string().nullable(),
  hashtags: z.array(z.string()),
  visualDirection: z.string(),
  // heroImage filled in by backfillImagesForDraft after generation —
  // intentionally not in the schema so Anthropic structured-output
  // doesn't reject `nullable: true` on the object type.
  voiceMatchConfidence: z.number(),
  brief: BriefShape,
});

const SlideTemplate = z.enum([
  "cover",       // big hero title
  "quote",       // dark bg, large pull quote
  "numbered",    // big number + short headline + body
  "statement",   // one bold sentence, lots of negative space
  "image_cue",   // photo placeholder + caption
  "list",        // 2–4 bullets
  "closer",      // payoff + CTA
]);

const SlidePalette = z.enum([
  "ink",      // black bg, white text
  "cream",    // surface bg, ink text
  "white",    // white bg, ink text
  "alive",    // alive accent on cream
  "attn",     // amber bg, attentionText
]);

const CarouselSlideShape = z.object({
  template: SlideTemplate,
  palette: SlidePalette,
  headline: z.string(),
  body: z.string(),
  number: z.string().nullable(),
  quoteAttribution: z.string().nullable(),
  bulletPoints: z.array(z.string()).nullable(),
  visualDirection: z.string(),
  // imageUrl filled in post-generation — see SinglePostShape note.
});

const CarouselShape = z.object({
  format: z.literal("CAROUSEL"),
  coverSlide: z.object({
    palette: SlidePalette,
    title: z.string(),
    subtitle: z.string().nullable(),
    visualDirection: z.string(),
  }),
  bodySlides: z.array(CarouselSlideShape),
  closerSlide: z.object({
    palette: SlidePalette,
    title: z.string(),
    body: z.string(),
    cta: z.string().nullable(),
  }),
  caption: z.string(),
  hashtags: z.array(z.string()),
  voiceMatchConfidence: z.number(),
  brief: BriefShape,
});

const ReelBeatShape = z.object({
  timestamp: z.string(),
  onScreenText: z.string(),
  voiceover: z.string().nullable(),
  bRoll: z.string(),
});

const ReelShape = z.object({
  format: z.literal("REEL_SCRIPT"),
  hook: z.string(),
  beats: z.array(ReelBeatShape),
  audioMood: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  voiceMatchConfidence: z.number(),
  brief: BriefShape,
});

const EmailSectionShape = z.object({
  heading: z.string().nullable(),
  body: z.string(),
});

const EmailShape = z.object({
  format: z.literal("EMAIL_NEWSLETTER"),
  subject: z.string(),
  preheader: z.string(),
  sections: z.array(EmailSectionShape),
  cta: z.object({
    label: z.string(),
    intent: z.string(),
    link: z.string().nullable(),
  }),
  visualDirection: z.string(),
  // heroImage filled in post-generation — see SinglePostShape note.
  voiceMatchConfidence: z.number(),
  brief: BriefShape,
});

const StoryFrameShape = z.object({
  text: z.string(),
  interaction: z.enum(["poll", "question", "slider", "none"]),
  visualDirection: z.string(),
});

const StorySequenceShape = z.object({
  format: z.literal("STORY_SEQUENCE"),
  frames: z.array(StoryFrameShape),
  voiceMatchConfidence: z.number(),
  brief: BriefShape,
});

const SCHEMAS = {
  SINGLE_POST: SinglePostShape,
  CAROUSEL: CarouselShape,
  REEL_SCRIPT: ReelShape,
  EMAIL_NEWSLETTER: EmailShape,
  STORY_SEQUENCE: StorySequenceShape,
} as const;

export type EchoOutput =
  | z.infer<typeof SinglePostShape>
  | z.infer<typeof CarouselShape>
  | z.infer<typeof ReelShape>
  | z.infer<typeof EmailShape>
  | z.infer<typeof StorySequenceShape>;

// =============================================================
// Core agent call.
// =============================================================

export async function runEcho(args: {
  format: ContentFormat;
  platform: Platform;
  businessDescription: string;
  brandVoice: unknown;
  recentCaptions: string[];
  performance?: PerformanceSummary;
  hint?: string;
  // When provided, Echo writes a deliberately different angle from this
  // first attempt — used for A/B variant generation.
  primaryAttempt?: EchoOutput;
  userId?: string;
}): Promise<EchoOutput> {
  const recentText =
    args.recentCaptions.length > 0
      ? args.recentCaptions.map((c, i) => `${i + 1}. ${c}`).join("\n\n")
      : "(no recent posts)";

  const performanceText = args.performance
    ? performanceForPrompt(args.performance)
    : "(no performance data — use brand voice as ground truth)";

  // Fact-heavy formats (long-form articles) and time-sensitive hints
  // (mentions of news/data/markets/Q1/etc) trigger a web-search pass
  // first. The research findings are pasted into the prompt as cited
  // bullets so the model writes from real, fresh data instead of stale
  // training-cutoff knowledge. Best-effort: if research fails we fall
  // through to no-research mode rather than block the draft.
  let researchBlock = "";
  if (
    !args.primaryAttempt && // skip on variant pass — it'd duplicate work
    shouldResearch({
      format: args.format,
      hint: args.hint,
      businessDescription: args.businessDescription,
    })
  ) {
    const findings = await gatherFreshContext({
      topic:
        args.hint?.trim() ||
        args.businessDescription?.trim() ||
        `${args.format} for ${args.platform}`,
      businessDescription: args.businessDescription,
      hint: args.hint,
      userId: args.userId,
    });
    if (findings) {
      const citationList = findings.citations.length > 0
        ? `\n\nCitations to thread into the post (use them when stating numbers):\n${findings.citations.map((c, i) => `[${i + 1}] ${c.url}`).join("\n")}`
        : "";
      researchBlock = `\n\nFresh research (use these facts — do not contradict them, do not invent numbers that aren't here):\n${findings.bullets}${citationList}\n`;
    }
  }

  const userMessage = `Business description:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

Recent post captions (avoid repeating themes):
${recentText}

Recent performance (what's resonating):
${performanceText}

Format requested: ${args.format}
Platform: ${args.platform}${
    args.platform === "TWITTER"
      ? "\nPlatform constraint: Twitter — keep the full post (hook + body + cta combined into a single short paragraph) under 280 characters total. No carousels, no thread numbering, no #hashtag stuffing — at most one well-chosen tag if it earns its place. Set `cta` to null and roll any call-to-action into the body."
      : args.platform === "WEBSITE_ARTICLE"
        ? "\nPlatform constraint: Website blog post — write a fuller, long-form piece (700–1200 words). Treat `body` as the article body in markdown. `hook` is the headline, `cta` is the closing line that nudges next action."
        : args.platform === "TELEGRAM"
          ? "\nPlatform constraint: Telegram channel post — write a tight, scannable update (max ~600 chars). Plain text, occasional emoji ok. Set `cta` to null unless the post explicitly needs one."
          : ""
  }
${args.hint ? `\nOwner hint for this post: ${args.hint}` : ""}${researchBlock}
${
  args.primaryAttempt
    ? `\nA primary version of this post already exists:\n${JSON.stringify(args.primaryAttempt, null, 2).slice(0, 1500)}\n\nWrite a DIFFERENT angle on the same brief. Different hook framework, different opening, different rhythm. Same intent + audience + pillar. The owner will pick whichever lands.`
    : ""
}

Write the next post.${languageLockDirective(
    `${args.businessDescription}\n${JSON.stringify(args.brandVoice ?? {})}`,
    "every text field in the output JSON (hook, body, caption, cta, hashtags, slide titles, slide bodies, email subject, email greeting, email closing, reel beats, story frames — everything published to the user's audience)",
  )}`;

  const schema = SCHEMAS[args.format as keyof typeof SCHEMAS];
  if (!schema) {
    throw new Error(`Unsupported Echo format: ${args.format}`);
  }
  const maxTokens =
    args.format === "CAROUSEL" || args.format === "EMAIL_NEWSLETTER"
      ? 4096
      : args.format === "REEL_SCRIPT"
        ? 3000
        : 2048;

  const response = await anthropic().messages.create({
    model: MODELS.OPUS,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: ECHO_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(schema),
      },
    },
  });

  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.ECHO,
      eventType: args.primaryAttempt ? "echo_variant" : "echo_draft",
      response,
      meta: { format: args.format, platform: args.platform },
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Echo returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return schema.parse(raw) as EchoOutput;
}

// =============================================================
// Orchestration: generate one new draft for the given user.
// Picks a format based on the platform + recent format mix to keep
// channel diversity (e.g., don't generate 5 single posts in a row when
// the user hasn't shipped a carousel in 2 weeks).
// =============================================================

async function pickFormatForPlatform(
  userId: string,
  platform: Platform,
  override?: ContentFormat,
): Promise<ContentFormat> {
  if (override) return override;
  if (platform === Platform.EMAIL) return ContentFormat.EMAIL_NEWSLETTER;
  if (
    platform === Platform.TWITTER ||
    platform === Platform.TELEGRAM ||
    platform === Platform.WEBSITE_ARTICLE
  ) {
    return ContentFormat.SINGLE_POST;
  }

  // Look at the last 8 drafts on this platform; pick whichever IG format
  // hasn't appeared most recently. Default to SINGLE_POST if no history.
  const recent = await db.contentDraft.findMany({
    where: { userId, platform },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { format: true },
  });

  const igFormats: ContentFormat[] = [
    ContentFormat.SINGLE_POST,
    ContentFormat.CAROUSEL,
    ContentFormat.REEL_SCRIPT,
  ];
  for (const f of igFormats) {
    if (!recent.some((r) => r.format === f)) return f;
  }
  return ContentFormat.SINGLE_POST;
}

// Used by content.generate tRPC + cron + agent.runNow.
export async function generateDailyContent(
  userId: string,
  hint?: string,
  format?: ContentFormat,
  platform: Platform = Platform.INSTAGRAM,
  withVariant = true,
): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      businessDescription: true,
      currentBusinessId: true,
    },
  });
  if (!user) throw new Error("User not found");

  // Active business — used both to scope reads (recent posts, drafts)
  // and to tag writes (the new ContentDraft is owned by this business).
  // Multi-business users have one active at a time; single-business
  // users have one Business which is auto-bootstrapped on signup.
  const businessId = user.currentBusinessId ?? null;

  // Pull the active business's description + voice. Without this Echo
  // would draft using the legacy primary description (English) and
  // business 1's voice — every Farsi business's posts came out
  // English. The active Business + its AgentContext are the source
  // of truth post multi-business migration.
  const business = businessId
    ? await db.business.findFirst({
        where: { id: businessId, userId },
        select: { description: true },
      })
    : null;
  const activeCtx = businessId
    ? await db.agentContext.findUnique({
        where: { businessId },
        select: { strategistOutput: true },
      })
    : null;
  if (!activeCtx?.strategistOutput) {
    throw new Error(
      "Brand voice not set — run onboarding analysis before generating content",
    );
  }
  const businessDescription =
    business?.description?.trim() || user.businessDescription || "";
  const brandVoice = activeCtx.strategistOutput;

  // Reserve credits before paying for any LLM calls.
  const cost =
    CREDIT_COSTS.ECHO_DRAFT + (withVariant ? CREDIT_COSTS.ECHO_VARIANT : 0);
  await consumeCredits(userId, cost, "echo_draft");

  const recentPosts = await db.contentPost.findMany({
    where: businessId
      ? { businessId }
      : { userId },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { metrics: true, draft: { select: { content: true } } },
  });

  const recentCaptions = recentPosts
    .map((p) => extractCaption(p.draft.content))
    .filter(Boolean);

  const performance = await summarizePerformance(userId, 90);
  const chosenFormat = await pickFormatForPlatform(userId, platform, format);

  const baseArgs = {
    format: chosenFormat,
    platform,
    businessDescription,
    brandVoice,
    recentCaptions,
    performance,
    hint,
    userId,
  };

  const primary = await runEcho(baseArgs);
  const alternate = withVariant
    ? await runEcho({ ...baseArgs, primaryAttempt: primary }).catch((err) => {
        // Variant failure shouldn't block the primary draft — log + skip.
        console.warn("Echo alternate-variant generation failed:", err);
        return null;
      })
    : null;

  const draft = await db.contentDraft.create({
    data: {
      userId,
      businessId,
      platform,
      format: chosenFormat,
      status: DraftStatus.AWAITING_REVIEW,
      content: primary as unknown as Prisma.InputJsonValue,
      alternateContent: alternate
        ? (alternate as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      brief: primary.brief as unknown as Prisma.InputJsonValue,
      voiceMatchScore: primary.voiceMatchConfidence,
    },
  });

  await db.agentEvent.create({
    data: {
      userId,
      agent: Agent.ECHO,
      eventType: "draft_created",
      payload: {
        draftId: draft.id,
        format: chosenFormat,
        platform,
        pillar: primary.brief.pillar,
        intent: primary.brief.intent,
        hookFramework: primary.brief.hookFramework,
        voiceMatchConfidence: primary.voiceMatchConfidence,
        hasAlternate: alternate !== null,
      },
    },
  });

  // Block on image generation — fire-and-forget gets killed by Vercel
  // when the serverless function returns. generateImageSafe inside never
  // throws, so this can't fail the draft.
  await backfillImagesForDraft(draft.id, userId, platform);

  return draft.id;
}

// Run async jobs with bounded concurrency. Replicate's burst limit is
// tight — running 6-8 image jobs in parallel from a single draft
// triggered cascading 429s where every retry slept past the next
// allowance and several beats would fail outright. Cap at 2 in
// flight; total wall-clock is similar (Replicate is the bottleneck
// either way) but no calls fail to backoff exhaustion.
async function runWithConcurrency<T>(
  jobs: Array<() => Promise<T>>,
  limit = 2,
): Promise<T[]> {
  const results: T[] = new Array(jobs.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= jobs.length) return;
      results[i] = await jobs[i]!();
    }
  }
  const workers = Array.from({ length: Math.min(limit, jobs.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

// Background: generate hero imagery for a freshly-created draft and patch
// the URL into the draft's content JSON. Best-effort — failures are logged
// and the draft is still usable as text-only.
export async function backfillImagesForDraft(
  draftId: string,
  userId: string,
  platform: Platform,
): Promise<void> {
  const draft = await db.contentDraft.findUnique({ where: { id: draftId } });
  if (!draft) return;
  const content = draft.content as Record<string, unknown> | null;
  if (!content || typeof content !== "object") return;

  // Pull the user's BrandKit so every image inherits the same look. If
  // they haven't generated one yet, prompts pass through unchanged.
  const kit = await db.brandKit.findFirst({
    where: { userId },
    select: { imageStyle: true },
  });
  const stylize = (raw: string): string =>
    kit?.imageStyle ? `${kit.imageStyle} ${raw}` : raw;

  let next: Record<string, unknown> = content;
  let totalCostCents = 0;
  let imagesGenerated = 0;

  if (content.format === "SINGLE_POST") {
    const direction =
      typeof content.visualDirection === "string"
        ? content.visualDirection
        : null;
    if (!direction) return;
    const result = await generateImageSafe({
      userId,
      draftId,
      slug: "hero",
      prompt: stylize(direction),
      aspectRatio: aspectRatioForPlatform(platform),
    });
    if (result) {
      next = {
        ...content,
        heroImage: { url: result.url, model: "flux-schnell" },
      };
      totalCostCents += result.costCents;
      imagesGenerated += 1;
    }
  } else if (content.format === "EMAIL_NEWSLETTER") {
    const direction =
      typeof content.visualDirection === "string"
        ? content.visualDirection
        : null;
    if (!direction) return;
    const result = await generateImageSafe({
      userId,
      draftId,
      slug: "email-hero",
      prompt: stylize(direction),
      aspectRatio: "16:9",
    });
    if (result) {
      next = {
        ...content,
        heroImage: { url: result.url, model: "flux-schnell" },
      };
      totalCostCents += result.costCents;
      imagesGenerated += 1;
    }
  } else if (content.format === "CAROUSEL") {
    const cover = content.coverSlide as
      | { visualDirection?: string; imageUrl?: string | null }
      | undefined;
    const bodySlides = (content.bodySlides as
      | Array<{
          template?: string;
          visualDirection?: string;
          imageUrl?: string | null;
        }>
      | undefined) ?? [];

    const jobs: Array<() => Promise<{
      target: "cover" | number;
      url: string;
      cost: number;
    } | null>> = [];

    if (cover?.visualDirection) {
      jobs.push(async () => {
        const r = await generateImageSafe({
          userId,
          draftId,
          slug: "cover",
          prompt: stylize(cover.visualDirection!),
          aspectRatio: "1:1",
        });
        return r ? { target: "cover" as const, url: r.url, cost: r.costCents } : null;
      });
    }
    bodySlides.forEach((slide, i) => {
      if (slide.template === "image_cue" && slide.visualDirection) {
        jobs.push(async () => {
          const r = await generateImageSafe({
            userId,
            draftId,
            slug: `slide-${i}`,
            prompt: stylize(slide.visualDirection!),
            aspectRatio: "1:1",
          });
          return r ? { target: i, url: r.url, cost: r.costCents } : null;
        });
      }
    });

    const results = await runWithConcurrency(jobs);
    const nextBody = bodySlides.map((s) => ({ ...s }));
    let nextCover = cover ? { ...cover } : undefined;
    for (const r of results) {
      if (!r) continue;
      totalCostCents += r.cost;
      imagesGenerated += 1;
      if (r.target === "cover" && nextCover) nextCover.imageUrl = r.url;
      else if (typeof r.target === "number") nextBody[r.target]!.imageUrl = r.url;
    }
    next = {
      ...content,
      ...(nextCover ? { coverSlide: nextCover } : {}),
      bodySlides: nextBody,
    };
  } else if (content.format === "REEL_SCRIPT") {
    const beats = (content.beats as
      | Array<{ bRoll?: string; imageUrl?: string | null }>
      | undefined) ?? [];
    const jobs = beats.map((beat, i) => async () => {
      if (!beat.bRoll) return null;
      const r = await generateImageSafe({
        userId,
        draftId,
        slug: `beat-${i}`,
        prompt: stylize(beat.bRoll),
        aspectRatio: "9:16",
      });
      return r ? { i, url: r.url, cost: r.costCents } : null;
    });
    const results = await runWithConcurrency(jobs);
    const nextBeats = beats.map((b) => ({ ...b }));
    for (const r of results) {
      if (!r) continue;
      nextBeats[r.i]!.imageUrl = r.url;
      totalCostCents += r.cost;
      imagesGenerated += 1;
    }
    next = { ...content, beats: nextBeats };
  } else if (content.format === "STORY_SEQUENCE") {
    const frames = (content.frames as
      | Array<{ visualDirection?: string; imageUrl?: string | null }>
      | undefined) ?? [];
    const jobs = frames.map((frame, i) => async () => {
      if (!frame.visualDirection) return null;
      const r = await generateImageSafe({
        userId,
        draftId,
        slug: `frame-${i}`,
        prompt: stylize(frame.visualDirection),
        aspectRatio: "9:16",
      });
      return r ? { i, url: r.url, cost: r.costCents } : null;
    });
    const results = await runWithConcurrency(jobs);
    const nextFrames = frames.map((f) => ({ ...f }));
    for (const r of results) {
      if (!r) continue;
      nextFrames[r.i]!.imageUrl = r.url;
      totalCostCents += r.cost;
      imagesGenerated += 1;
    }
    next = { ...content, frames: nextFrames };
  } else {
    return;
  }

  if (imagesGenerated === 0) return;

  await db.contentDraft.update({
    where: { id: draftId },
    data: { content: next as unknown as Prisma.InputJsonValue },
  });
  await db.agentEvent.create({
    data: {
      userId,
      agent: Agent.ECHO,
      eventType: "image_generated",
      payload: {
        draftId,
        model: "flux-schnell",
        imagesGenerated,
        costCents: totalCostCents,
      },
    },
  });
}

function aspectRatioForPlatform(platform: Platform): AspectRatio {
  switch (platform) {
    case Platform.INSTAGRAM:
      return "4:5";
    case Platform.LINKEDIN:
    case Platform.FACEBOOK:
    case Platform.EMAIL:
    case Platform.TWITTER:
    case Platform.WEBSITE_ARTICLE:
      return "16:9";
    case Platform.PINTEREST:
      return "2:3";
    case Platform.TELEGRAM:
      return "1:1";
    default:
      return "1:1";
  }
}

// Regenerate an existing draft in place — keeps the same format, feeds the
// previous attempt back so Echo doesn't repeat the angle.
export async function regenerateDraftContent(
  draftId: string,
  hint?: string,
): Promise<void> {
  const draft = await db.contentDraft.findUnique({
    where: { id: draftId },
    include: {
      user: { select: { id: true, businessDescription: true } },
      business: { select: { id: true, description: true } },
    },
  });
  if (!draft) throw new Error("Draft not found");

  // Read voice + description from the draft's BUSINESS, not the user.
  // A user with multiple businesses can regenerate a draft on either
  // business — we need to use that business's voice, not whichever
  // AgentContext happened to be first in the list.
  const draftBusinessId = draft.businessId ?? draft.business?.id;
  const draftCtx = draftBusinessId
    ? await db.agentContext.findUnique({
        where: { businessId: draftBusinessId },
        select: { strategistOutput: true },
      })
    : null;
  if (!draftCtx?.strategistOutput) {
    throw new Error(
      "Brand voice not set — run onboarding analysis before regenerating",
    );
  }

  await consumeCredits(draft.userId, CREDIT_COSTS.ECHO_DRAFT, "echo_regenerate");

  const prevCaption = extractCaption(draft.content);

  const recentPosts = await db.contentPost.findMany({
    where: draftBusinessId
      ? { businessId: draftBusinessId }
      : { userId: draft.userId },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { metrics: true, draft: { select: { content: true } } },
  });

  const recentCaptions = recentPosts
    .map((p) => extractCaption(p.draft.content))
    .filter(Boolean);

  const performance = await summarizePerformance(draft.userId, 90);

  const combinedHint = [
    hint,
    prevCaption ? `Previous attempt didn't land: "${prevCaption.slice(0, 200)}"` : null,
  ]
    .filter((s): s is string => Boolean(s))
    .join(". ");

  const result = await runEcho({
    format: draft.format,
    platform: draft.platform,
    businessDescription:
      draft.business?.description?.trim() ||
      draft.user.businessDescription ||
      "",
    brandVoice: draftCtx.strategistOutput,
    recentCaptions,
    performance,
    hint: combinedHint || undefined,
    userId: draft.userId,
  });

  await db.contentDraft.update({
    where: { id: draftId },
    data: {
      status: DraftStatus.AWAITING_REVIEW,
      content: result as unknown as Prisma.InputJsonValue,
      brief: result.brief as unknown as Prisma.InputJsonValue,
      voiceMatchScore: result.voiceMatchConfidence,
      rejectedAt: null,
      rejectionReason: null,
      // Drop stale motion state. The previous content's video (if any)
      // doesn't match the new copy, and leaving motion.mp4Url around
      // means the reel mockup keeps playing the old broken/outdated
      // mp4 and the loader gets stuck if status was "rendering".
      motion: Prisma.JsonNull,
    },
  });

  await db.agentEvent.create({
    data: {
      userId: draft.userId,
      agent: Agent.ECHO,
      eventType: "draft_regenerated",
      payload: {
        draftId,
        format: draft.format,
        hint: hint ?? null,
      },
    },
  });
}

// =============================================================
// Helpers — pull a flattened caption preview out of any format so
// downstream UI / agents can show one line per draft.
// =============================================================

function extractCaption(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  if (typeof c.caption === "string") return c.caption;
  if (typeof c.body === "string") return c.body;
  if (typeof c.subject === "string") {
    const pre = typeof c.preheader === "string" ? ` — ${c.preheader}` : "";
    return `${c.subject}${pre}`;
  }
  if (
    c.coverSlide &&
    typeof c.coverSlide === "object" &&
    typeof (c.coverSlide as Record<string, unknown>).title === "string"
  ) {
    return (c.coverSlide as { title: string }).title;
  }
  if (typeof c.hook === "string") return c.hook;
  return "";
}

function extractPillar(content: unknown): string | undefined {
  if (!content || typeof content !== "object") return undefined;
  const c = content as Record<string, unknown>;
  if (
    c.brief &&
    typeof c.brief === "object" &&
    typeof (c.brief as Record<string, unknown>).pillar === "string"
  ) {
    return (c.brief as { pillar: string }).pillar;
  }
  if (typeof c.pillar === "string") return c.pillar;
  return undefined;
}

// =============================================================
// Drafts a specific ContentPlanItem — uses the item's format / platform /
// angle / hookIdea / intent / audience / pillar as a tight brief, plus
// the planner's overall thesis as additional context. Links the resulting
// ContentDraft back to the plan item so the week view can show it as
// "drafted" instead of "planned".
// =============================================================
export async function draftPlanItem(
  itemId: string,
  hint?: string,
): Promise<string> {
  const item = await db.contentPlanItem.findUnique({
    where: { id: itemId },
    include: {
      plan: {
        include: {
          user: { select: { id: true, businessDescription: true } },
          business: { select: { id: true, description: true } },
        },
      },
    },
  });
  if (!item) throw new Error("Plan item not found");
  const user = item.plan.user;

  // Plans always belong to a Business now. Read voice from THAT
  // business's AgentContext — without this, drafting a plan item on
  // business 2 would use business 1's voice (the array's first
  // entry), and Farsi plans would draft in English.
  const planBusinessId = item.plan.businessId ?? item.plan.business?.id;
  const planCtx = planBusinessId
    ? await db.agentContext.findUnique({
        where: { businessId: planBusinessId },
        select: { strategistOutput: true },
      })
    : null;
  if (!planCtx?.strategistOutput) {
    throw new Error("Brand voice not set — run Strategist first");
  }

  await consumeCredits(user.id, CREDIT_COSTS.ECHO_DRAFT, "echo_plan_item");

  const recentPosts = await db.contentPost.findMany({
    where: planBusinessId
      ? { businessId: planBusinessId }
      : { userId: user.id },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { metrics: true, draft: { select: { content: true } } },
  });
  const recentCaptions = recentPosts
    .map((p) => extractCaption(p.draft.content))
    .filter(Boolean);
  const performance = await summarizePerformance(user.id, 90);

  // Stitch the plan-item brief into a hint that Echo can use directly.
  const richHint = [
    `Week's thesis: ${item.plan.thesis ?? "(none set)"}`,
    `Slot intent: ${item.intent} · audience: ${item.audience} · pillar: ${item.pillar}`,
    `Angle for this slot: ${item.angle}`,
    `Suggested opening hook: ${item.hookIdea}`,
    `Why this slot, this week: ${item.reasoning}`,
    hint ? `Owner hint: ${hint}` : null,
  ]
    .filter((s): s is string => Boolean(s))
    .join("\n");

  const result = await runEcho({
    format: item.format,
    platform: item.platform,
    businessDescription:
      item.plan.business?.description?.trim() ||
      user.businessDescription ||
      "",
    brandVoice: planCtx.strategistOutput,
    recentCaptions,
    performance,
    hint: richHint,
    userId: user.id,
  });

  // If a draft already exists for this item, replace it; otherwise create.
  let draftId: string;
  if (item.draftId) {
    await db.contentDraft.update({
      where: { id: item.draftId },
      data: {
        status: DraftStatus.AWAITING_REVIEW,
        content: result as unknown as Prisma.InputJsonValue,
        brief: result.brief as unknown as Prisma.InputJsonValue,
        voiceMatchScore: result.voiceMatchConfidence,
        rejectedAt: null,
        rejectionReason: null,
      },
    });
    draftId = item.draftId;
  } else {
    const draft = await db.contentDraft.create({
      data: {
        userId: user.id,
        // Plans always belong to a Business now — use the plan's
        // businessId so the draft stays attached to the same brand.
        businessId: planBusinessId ?? null,
        platform: item.platform,
        format: item.format,
        status: DraftStatus.AWAITING_REVIEW,
        content: result as unknown as Prisma.InputJsonValue,
        brief: result.brief as unknown as Prisma.InputJsonValue,
        voiceMatchScore: result.voiceMatchConfidence,
        scheduledFor: item.scheduledFor,
      },
    });
    draftId = draft.id;
  }

  await db.contentPlanItem.update({
    where: { id: itemId },
    data: {
      draftId,
      status: ContentPlanItemStatus.DRAFTED,
    },
  });

  await db.agentEvent.create({
    data: {
      userId: user.id,
      agent: Agent.ECHO,
      eventType: "plan_item_drafted",
      payload: {
        planItemId: itemId,
        draftId,
        format: item.format,
        platform: item.platform,
        pillar: item.pillar,
      },
    },
  });

  return draftId;
}

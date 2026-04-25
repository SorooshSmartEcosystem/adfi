import { z } from "zod";
import {
  db,
  Agent,
  ContentFormat,
  DraftStatus,
  Platform,
  type Prisma,
} from "@orb/db";
import { anthropic, jsonSchemaForAnthropic, MODELS } from "../services/anthropic";
import { ECHO_SYSTEM_PROMPT } from "./prompts/echo";

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
  voiceMatchConfidence: z.number(),
  brief: BriefShape,
});

const CarouselSlideShape = z.object({
  headline: z.string(),
  body: z.string(),
  visualDirection: z.string(),
});

const CarouselShape = z.object({
  format: z.literal("CAROUSEL"),
  coverSlide: z.object({
    title: z.string(),
    subtitle: z.string().nullable(),
  }),
  bodySlides: z.array(CarouselSlideShape),
  closerSlide: z.object({
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
  recentPerformance?: { caption: string; reach: number; pillar?: string }[];
  hint?: string;
}): Promise<EchoOutput> {
  const recentText =
    args.recentCaptions.length > 0
      ? args.recentCaptions.map((c, i) => `${i + 1}. ${c}`).join("\n\n")
      : "(no recent posts)";

  const performanceText =
    args.recentPerformance && args.recentPerformance.length > 0
      ? args.recentPerformance
          .map(
            (p, i) =>
              `${i + 1}. reach: ${p.reach.toLocaleString()}${p.pillar ? ` · ${p.pillar}` : ""} — "${p.caption.slice(0, 80)}"`,
          )
          .join("\n")
      : "(no performance data yet — use brand voice as ground truth)";

  const userMessage = `Business description:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

Recent post captions (avoid repeating themes):
${recentText}

Recent performance (what's resonating):
${performanceText}

Format requested: ${args.format}
Platform: ${args.platform}
${args.hint ? `\nOwner hint for this post: ${args.hint}` : ""}

Write the next post.`;

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
): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { agentContext: true },
  });
  if (!user) throw new Error("User not found");
  if (!user.agentContext?.strategistOutput) {
    throw new Error(
      "Brand voice not set — run onboarding analysis before generating content",
    );
  }

  const recentPosts = await db.contentPost.findMany({
    where: { userId },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { metrics: true, draft: { select: { content: true } } },
  });

  const recentCaptions = recentPosts
    .map((p) => extractCaption(p.draft.content))
    .filter(Boolean);

  const recentPerformance = recentPosts
    .map((p) => {
      const m = (p.metrics ?? {}) as { reach?: number };
      const c = extractCaption(p.draft.content);
      const pillar = extractPillar(p.draft.content);
      if (!c) return null;
      return {
        caption: c,
        reach: m.reach ?? 0,
        ...(pillar && { pillar }),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const chosenFormat = await pickFormatForPlatform(userId, platform, format);

  const result = await runEcho({
    format: chosenFormat,
    platform,
    businessDescription: user.businessDescription ?? "",
    brandVoice: user.agentContext.strategistOutput,
    recentCaptions,
    recentPerformance,
    hint,
  });

  const draft = await db.contentDraft.create({
    data: {
      userId,
      platform,
      format: chosenFormat,
      status: DraftStatus.AWAITING_REVIEW,
      content: result as unknown as Prisma.InputJsonValue,
      brief: result.brief as unknown as Prisma.InputJsonValue,
      voiceMatchScore: result.voiceMatchConfidence,
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
        pillar: result.brief.pillar,
        intent: result.brief.intent,
        hookFramework: result.brief.hookFramework,
        voiceMatchConfidence: result.voiceMatchConfidence,
      },
    },
  });

  return draft.id;
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
      user: { include: { agentContext: true } },
    },
  });
  if (!draft) throw new Error("Draft not found");
  if (!draft.user.agentContext?.strategistOutput) {
    throw new Error(
      "Brand voice not set — run onboarding analysis before regenerating",
    );
  }

  const prevCaption = extractCaption(draft.content);

  const recentPosts = await db.contentPost.findMany({
    where: { userId: draft.userId },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { metrics: true, draft: { select: { content: true } } },
  });

  const recentCaptions = recentPosts
    .map((p) => extractCaption(p.draft.content))
    .filter(Boolean);

  const recentPerformance = recentPosts
    .map((p) => {
      const m = (p.metrics ?? {}) as { reach?: number };
      const c = extractCaption(p.draft.content);
      const pillar = extractPillar(p.draft.content);
      if (!c) return null;
      return {
        caption: c,
        reach: m.reach ?? 0,
        ...(pillar && { pillar }),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const combinedHint = [
    hint,
    prevCaption ? `Previous attempt didn't land: "${prevCaption.slice(0, 200)}"` : null,
  ]
    .filter((s): s is string => Boolean(s))
    .join(". ");

  const result = await runEcho({
    format: draft.format,
    platform: draft.platform,
    businessDescription: draft.user.businessDescription ?? "",
    brandVoice: draft.user.agentContext.strategistOutput,
    recentCaptions,
    recentPerformance,
    hint: combinedHint || undefined,
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

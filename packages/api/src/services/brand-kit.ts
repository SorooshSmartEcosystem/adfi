// BrandKit generation pipeline.
//
//   Step 1 — Anthropic (Sonnet) writes a brand SPEC: palette + typography +
//            imageStyle + a logoConcept.
//   Step 2 — Replicate (Flux Schnell) renders 4 logo variants + 3 cover
//            samples in parallel.
//   Step 3 — Persist BrandKit row + AgentEvent for usage tracking.
//
// Cost per generation: ~$0.02 (Sonnet) + 7 × ~$0.003 (Flux) ≈ $0.04.
// Plan caps live in `MONTHLY_BRANDKIT_CAP` and are enforced by callers via
// `brandKitGenerationsRemaining()`.

import { z } from "zod";
import {
  db,
  Agent,
  Prisma,
  type Plan,
} from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "./anthropic";
import { generateImage } from "./replicate";

// Plan ceilings on brand-kit generations per 30 days. The first generation
// per user is essentially free (anyone can have a brandkit); subsequent
// regenerations are bounded so a user can't spin the wheel infinitely.
export const MONTHLY_BRANDKIT_CAP: Record<Plan | "TRIAL", number> = {
  TRIAL: 1,
  SOLO: 3,
  TEAM: 10,
  STUDIO: 999,
};

// Approximate per-generation cost (cents). Used for admin financials and
// surfaced in the UI so the user knows what a regenerate costs.
export const BRANDKIT_GENERATION_COST_CENTS = 4;

const PaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  ink: z.string(),
  surface: z.string(),
  bg: z.string(),
  rationale: z.string(),
});

const TypographySchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
  weights: z.array(z.string()),
  rationale: z.string(),
});

const BrandSpecSchema = z.object({
  palette: PaletteSchema,
  typography: TypographySchema,
  imageStyle: z.string(),
  logoConcept: z.string(),
});

export type BrandSpec = z.infer<typeof BrandSpecSchema>;

const SYSTEM_PROMPT = `You are the visual director for a solopreneur's marketing system. You design tight, intentional brand specs — never generic, never trend-chasing.

For palette: choose 6 hex colors that feel coherent and confident. Avoid pure-black/pure-white unless the brand's voice calls for it. Include rationale: why these colors fit the business.

For typography: pick web-safe font pairings (Google Fonts or system stack). Heading + body. Include weights and a one-sentence rationale.

For imageStyle: write a 1-2 sentence prompt fragment we will prepend to every image generation. Describe the photographic look, color cast, and mood. Use specific photography terms ('warm natural light', 'editorial documentary feel', 'shallow depth of field', 'desaturated color grading').

For logoConcept: a short visual description for an icon-style mark. We'll render it as four PNG variants — keep the concept simple enough to read at 32px.`;

export async function generateBrandKitSpec(args: {
  businessName: string;
  businessDescription: string;
  voiceTone: unknown;
  refinementHint?: string;
  userId?: string;
}): Promise<BrandSpec> {
  const userMessage = `Business name: ${args.businessName}
Business description: ${args.businessDescription || "(not set)"}

Brand voice (frozen from strategist):
${JSON.stringify(args.voiceTone ?? {}, null, 2)}

${args.refinementHint ? `Owner refinement hint for this generation: ${args.refinementHint}\n\n` : ""}Design the brand spec.`;

  const response = await anthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(BrandSpecSchema),
      },
    },
  });

  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.STRATEGIST,
      eventType: "brandkit_spec",
      response,
    });
  }

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("brandkit spec returned no text content");
  }
  return BrandSpecSchema.parse(JSON.parse(block.text));
}

// Full BrandKit generation. Idempotent at the row level — if a kit exists
// we update it (and bump version); otherwise we create one.
export async function generateBrandKit(args: {
  userId: string;
  refinementHint?: string;
}): Promise<{
  kitId: string;
  version: number;
  totalCostCents: number;
}> {
  const user = await db.user.findUnique({
    where: { id: args.userId },
    include: { agentContext: true },
  });
  if (!user) throw new Error("user not found");

  const businessName =
    user.businessName?.trim() ||
    user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 40)?.trim() ||
    "the business";
  const description = user.businessDescription ?? "";
  const voiceTone = user.agentContext?.strategistOutput ?? null;

  // 1. Spec
  const spec = await generateBrandKitSpec({
    businessName,
    businessDescription: description,
    voiceTone,
    refinementHint: args.refinementHint,
    userId: args.userId,
  });

  // 2. Images. Logo prompts are deliberately tight — Flux Schnell does
  // best with concrete visual direction. Cover samples use the spec's
  // imageStyle prepended to a short scene cue.
  const logoBase = `Minimalist icon-style logo mark for "${businessName}". Concept: ${spec.logoConcept}. Centered on plain white background. No typography, no text, no letters. Flat geometric shapes. Single accent color: ${spec.palette.accent}. Studio lighting, vector-style finish.`;
  const coverBase = `${spec.imageStyle} Editorial photograph for "${businessName}".`;

  const slug = (s: string) => `brandkit-${s}`;
  const [primary, mark, mono, dark, cover1, cover2, cover3] = await Promise.all([
    generateImage({
      userId: args.userId,
      draftId: "brandkit",
      slug: slug("logo-primary"),
      prompt: logoBase,
      aspectRatio: "1:1",
    }),
    generateImage({
      userId: args.userId,
      draftId: "brandkit",
      slug: slug("logo-mark"),
      prompt: `${logoBase} Just the icon mark, simplified, centered.`,
      aspectRatio: "1:1",
    }),
    generateImage({
      userId: args.userId,
      draftId: "brandkit",
      slug: slug("logo-mono"),
      prompt: `Monochrome black icon mark on white background. ${spec.logoConcept}. Flat shapes, no gradient, no text.`,
      aspectRatio: "1:1",
    }),
    generateImage({
      userId: args.userId,
      draftId: "brandkit",
      slug: slug("logo-dark"),
      prompt: `White icon mark on solid charcoal background. ${spec.logoConcept}. Flat shapes, no gradient, no text.`,
      aspectRatio: "1:1",
    }),
    generateImage({
      userId: args.userId,
      draftId: "brandkit",
      slug: slug("cover-1"),
      prompt: `${coverBase} Scene: a quiet workspace shot, hands at work, no faces.`,
      aspectRatio: "16:9",
    }),
    generateImage({
      userId: args.userId,
      draftId: "brandkit",
      slug: slug("cover-2"),
      prompt: `${coverBase} Scene: a tight product or detail shot. No people.`,
      aspectRatio: "16:9",
    }),
    generateImage({
      userId: args.userId,
      draftId: "brandkit",
      slug: slug("cover-3"),
      prompt: `${coverBase} Scene: lifestyle, atmospheric, sense of place.`,
      aspectRatio: "16:9",
    }),
  ]);

  const totalCostCents =
    primary.costCents +
    mark.costCents +
    mono.costCents +
    dark.costCents +
    cover1.costCents +
    cover2.costCents +
    cover3.costCents;

  // 3. Persist
  const existing = await db.brandKit.findUnique({
    where: { userId: args.userId },
  });
  const kit = await db.brandKit.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      palette: spec.palette as unknown as Prisma.InputJsonValue,
      typography: spec.typography as unknown as Prisma.InputJsonValue,
      logoVariants: {
        primary: primary.url,
        mark: mark.url,
        monochrome: mono.url,
        lightOnDark: dark.url,
      },
      coverSamples: [cover1.url, cover2.url, cover3.url],
      imageStyle: spec.imageStyle,
      voiceTone: (voiceTone ?? Prisma.DbNull) as Prisma.InputJsonValue,
      version: 1,
      generatedAt: new Date(),
    },
    update: {
      palette: spec.palette as unknown as Prisma.InputJsonValue,
      typography: spec.typography as unknown as Prisma.InputJsonValue,
      logoVariants: {
        primary: primary.url,
        mark: mark.url,
        monochrome: mono.url,
        lightOnDark: dark.url,
      },
      coverSamples: [cover1.url, cover2.url, cover3.url],
      imageStyle: spec.imageStyle,
      voiceTone: (voiceTone ?? Prisma.DbNull) as Prisma.InputJsonValue,
      version: (existing?.version ?? 0) + 1,
      generatedAt: new Date(),
    },
  });

  await db.agentEvent.create({
    data: {
      userId: args.userId,
      agent: Agent.STRATEGIST,
      eventType: "brandkit_generated",
      payload: {
        version: kit.version,
        imageCostCents: totalCostCents,
      },
    },
  });

  return { kitId: kit.id, version: kit.version, totalCostCents };
}

// How many generations the user has left in the trailing 30-day window.
// Returns 0 when capped — callers should refuse the regenerate mutation.
export async function brandKitGenerationsRemaining(
  userId: string,
  plan: Plan | "TRIAL",
): Promise<{ used: number; cap: number; remaining: number }> {
  const cap = MONTHLY_BRANDKIT_CAP[plan];
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const used = await db.agentEvent.count({
    where: {
      userId,
      eventType: "brandkit_generated",
      createdAt: { gte: since },
    },
  });
  return {
    used,
    cap,
    remaining: Math.max(0, cap - used),
  };
}

// Inline edit of just the imageStyle prompt — lets a power user bias
// future image generations without burning a regeneration.
export async function updateBrandKitImageStyle(args: {
  userId: string;
  imageStyle: string;
}): Promise<void> {
  await db.brandKit.update({
    where: { userId: args.userId },
    data: { imageStyle: args.imageStyle },
  });
}

export async function getBrandKit(userId: string) {
  return db.brandKit.findUnique({ where: { userId } });
}

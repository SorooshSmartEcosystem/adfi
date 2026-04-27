// BrandKit generation pipeline. Pure-Anthropic — no Replicate calls.
//
//   Step 1 — Sonnet generates the brand SPEC: palette, typography,
//            imageStyle, and a logo concept (used to seed the SVGs).
//   Step 2 — Sonnet generates 5 SVG logo templates (primary, mark,
//            monochrome, lightOnDark, wordmark) with palette tokens
//            ({{primary}}, {{accent}}, {{ink}}, etc.) so the user can
//            edit colors later and the logos update live.
//   Step 3 — Sonnet generates 3 SVG brand-graphic covers — geometric
//            abstract compositions usable for social headers, business
//            cards, presentation backgrounds. Also tokenized.
//   Step 4 — Persist BrandKit row + AgentEvent for usage tracking.
//
// Cost per generation: ~$0.06 in Anthropic only (3 Sonnet calls).
// Plan caps in MONTHLY_BRANDKIT_CAP enforced by the router.

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

// Plan ceilings on brand-kit generations per 30 days.
export const MONTHLY_BRANDKIT_CAP: Record<Plan | "TRIAL", number> = {
  TRIAL: 1,
  SOLO: 3,
  TEAM: 10,
  STUDIO: 999,
};

// Approximate per-generation cost (cents). Three Sonnet calls — spec,
// logos batch, graphics batch. Used in the UI quota line.
export const BRANDKIT_GENERATION_COST_CENTS = 6;

// =============================================================
// Spec generation
// =============================================================

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

const SPEC_SYSTEM_PROMPT = `You are the visual director for a solopreneur's marketing system. You design tight, intentional brand specs — never generic, never trend-chasing.

For palette: choose 6 hex colors that feel coherent and confident. Avoid pure-black/pure-white unless the brand's voice calls for it. Palette roles:
- primary: the dominant brand color (used on CTAs, key UI)
- secondary: supporting color (used on secondary buttons, links)
- accent: a single sparing accent (status dots, gold trim, callouts)
- ink: text color (very dark, not pure black)
- surface: card / elevated surface fill (warm off-white if light brand, very dark if dark brand)
- bg: page background (always slightly cooler/lighter than surface)
Include a one-sentence rationale.

For typography: pick web-safe pairings. Heading font + body font + 2-3 weights. Always include a Google Fonts pairing or a system stack. Examples: 'Cormorant Garamond' + 'Inter', 'Fraunces' + 'IBM Plex Sans', system + system. Include rationale.

For imageStyle: a 1-2 sentence prompt fragment we will prepend to every photo generation downstream (used by Echo for blog/social images). Specific photography terms — 'warm natural light', 'editorial documentary feel', 'desaturated color grading', etc.

For logoConcept: a short visual description for an icon-style mark — concrete enough to render as SVG. Example: 'minimalist house silhouette with cabinetry grid lines' or 'concentric arcs forming a stylized eye'. Keep it geometric and renderable; avoid 'a logo that captures the essence of...'.`;

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
        text: SPEC_SYSTEM_PROMPT,
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

// =============================================================
// SVG generation — logos + brand graphics
// =============================================================

const LogoTemplatesSchema = z.object({
  // Square mark on the brand's surface color. The "hero" version of
  // the logo. Should stand alone at any size.
  primary: z.string(),
  // Just the icon, no text, optimized for tiny sizes (favicon-friendly).
  mark: z.string(),
  // Pure black on white, used for embossing / single-color print.
  monochrome: z.string(),
  // Light variant for use on the brand's dark/ink background.
  lightOnDark: z.string(),
  // Wordmark + icon horizontal lockup.
  wordmark: z.string(),
});

const BrandGraphicsSchema = z.object({
  graphic1: z.string(),
  graphic2: z.string(),
  graphic3: z.string(),
});

const LOGO_SYSTEM_PROMPT = `You are a senior brand designer producing publishable SVG logo marks. Your output renders directly to <img src=data:...> in the user's brand book — there is no human cleanup pass.

Output 5 SVG variants of the same logo concept. Every SVG MUST:
- Use viewBox="0 0 240 240" for square variants and viewBox="0 0 480 240" for the wordmark.
- Be self-contained (no external <link> or <script>). All gradients/patterns inline in <defs>.
- Use color tokens for fills/strokes — write them literally as the strings {{primary}}, {{secondary}}, {{accent}}, {{ink}}, {{surface}}, {{bg}}. The system replaces these with the user's palette at render time. Never inline literal hex codes.
- Keep geometry simple — straight lines, arcs, polygons, simple paths. No raster <image>, no embedded fonts, no <foreignObject>.
- The wordmark variant MUST include <text> with the business name in lowercase, font-family="Inter, system-ui, sans-serif" (the actual font swaps in via CSS), font-weight="500", and reasonable letter-spacing.
- Aim for the visual density of a Wirecutter / Frank Body / Aesop logo — restrained, intentional, every line earns its place.

Variants:
- primary: full mark on surface color background (rect filling the viewBox is fine), the mark in {{ink}} or {{primary}}.
- mark: just the icon, no background rect, no text. Optimized for clarity at 32px.
- monochrome: pure {{ink}} on transparent. Single color, no fills with {{accent}}.
- lightOnDark: a {{ink}}-filled rect background, mark in {{surface}} or {{bg}} (light on dark).
- wordmark: horizontal lockup — icon on the left, business name in {{ink}} on the right. 480×240 viewBox.

Keep each SVG under 1500 chars where possible.`;

export async function generateLogoTemplates(args: {
  businessName: string;
  logoConcept: string;
  userId?: string;
}): Promise<z.infer<typeof LogoTemplatesSchema>> {
  const userMessage = `Business name: ${args.businessName}
Logo concept: ${args.logoConcept}

Generate the 5 SVG variants.`;
  const response = await anthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 8000,
    system: [
      { type: "text", text: LOGO_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(LogoTemplatesSchema),
      },
    },
  });
  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.STRATEGIST,
      eventType: "brandkit_logos",
      response,
    });
  }
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("logo generation returned no text content");
  }
  return LogoTemplatesSchema.parse(JSON.parse(block.text));
}

const GRAPHICS_SYSTEM_PROMPT = `You are a senior brand designer producing decorative SVG cover graphics — abstract geometric compositions used as social-media headers, presentation slides, and business-card backs. Hand-tuned vectors only; never raster.

Output 3 distinct compositions in the same brand world. Every SVG MUST:
- Use viewBox="0 0 1200 630" (Twitter / OG image proportions).
- Use color tokens {{primary}} / {{secondary}} / {{accent}} / {{ink}} / {{surface}} / {{bg}} for all fills/strokes — never literal hex codes.
- Use simple geometric primitives — circles, rectangles, lines, paths, arcs, polygons. Optional simple patterns via <pattern>. No <image> tags, no <foreignObject>, no embedded fonts.
- Compose intentionally: one bold focal element + supporting marks, or a rhythmic grid, or stacked arcs. Never a generic 'gradient mesh background'.
- Keep each under 4000 chars.

Variants — three different aesthetics so the user has range:
- graphic1: tight focal composition (one strong shape with surrounding accents).
- graphic2: rhythmic / grid-based pattern that could repeat (think editorial spread).
- graphic3: atmospheric / spatial (overlapping forms suggesting depth, like a stage set).

Treat the whole canvas — fill the {{bg}} or {{surface}} background; don't leave white-on-white.`;

export async function generateBrandGraphics(args: {
  businessName: string;
  imageStyle: string;
  userId?: string;
}): Promise<z.infer<typeof BrandGraphicsSchema>> {
  const userMessage = `Business name: ${args.businessName}
Brand image style (for atmosphere — translate to vector geometry):
${args.imageStyle}

Generate the 3 SVG cover graphics.`;
  const response = await anthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 12000,
    system: [
      {
        type: "text",
        text: GRAPHICS_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(BrandGraphicsSchema),
      },
    },
  });
  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.STRATEGIST,
      eventType: "brandkit_graphics",
      response,
    });
  }
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("graphics generation returned no text content");
  }
  return BrandGraphicsSchema.parse(JSON.parse(block.text));
}

// =============================================================
// Token replacement — the rendering side of the SVG-template approach
// =============================================================

export type Palette = z.infer<typeof PaletteSchema>;

// Replaces {{primary}} / {{accent}} / etc. tokens in an SVG string with
// the actual hex codes from the user's palette. Used both for live
// previews (UI) and exported assets (downloads / Echo composition).
export function applyPaletteToSvg(svg: string, palette: Palette): string {
  return svg
    .replace(/\{\{primary\}\}/g, palette.primary)
    .replace(/\{\{secondary\}\}/g, palette.secondary)
    .replace(/\{\{accent\}\}/g, palette.accent)
    .replace(/\{\{ink\}\}/g, palette.ink)
    .replace(/\{\{surface\}\}/g, palette.surface)
    .replace(/\{\{bg\}\}/g, palette.bg);
}

// =============================================================
// Top-level generate
// =============================================================

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

  const t0 = Date.now();
  console.log(`[brandkit] starting generation for user=${args.userId}`);

  // 1. Spec
  const spec = await generateBrandKitSpec({
    businessName,
    businessDescription: description,
    voiceTone,
    refinementHint: args.refinementHint,
    userId: args.userId,
  });
  console.log(
    `[brandkit] spec done in ${Math.round((Date.now() - t0) / 1000)}s`,
  );

  // 2. Logo SVGs (parallel with graphics for speed — both Anthropic, no
  // rate limit concerns at the per-account level for this volume).
  const logosT = Date.now();
  const graphicsT = Date.now();
  const [logos, graphics] = await Promise.all([
    generateLogoTemplates({
      businessName,
      logoConcept: spec.logoConcept,
      userId: args.userId,
    }),
    generateBrandGraphics({
      businessName,
      imageStyle: spec.imageStyle,
      userId: args.userId,
    }),
  ]);
  console.log(
    `[brandkit] logos done in ${Math.round((Date.now() - logosT) / 1000)}s, graphics in ${Math.round((Date.now() - graphicsT) / 1000)}s`,
  );

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
      logoTemplates: logos as unknown as Prisma.InputJsonValue,
      coverSamples: [
        graphics.graphic1,
        graphics.graphic2,
        graphics.graphic3,
      ] as unknown as Prisma.InputJsonValue,
      imageStyle: spec.imageStyle,
      logoConcept: spec.logoConcept,
      voiceTone: (voiceTone ?? Prisma.DbNull) as Prisma.InputJsonValue,
      version: 1,
      generatedAt: new Date(),
    },
    update: {
      palette: spec.palette as unknown as Prisma.InputJsonValue,
      typography: spec.typography as unknown as Prisma.InputJsonValue,
      logoTemplates: logos as unknown as Prisma.InputJsonValue,
      coverSamples: [
        graphics.graphic1,
        graphics.graphic2,
        graphics.graphic3,
      ] as unknown as Prisma.InputJsonValue,
      imageStyle: spec.imageStyle,
      logoConcept: spec.logoConcept,
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
      payload: { version: kit.version },
    },
  });

  console.log(
    `[brandkit] complete in ${Math.round((Date.now() - t0) / 1000)}s for user=${args.userId}`,
  );

  return {
    kitId: kit.id,
    version: kit.version,
    totalCostCents: BRANDKIT_GENERATION_COST_CENTS,
  };
}

// =============================================================
// Edit / read mutations
// =============================================================

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

export async function updateBrandKitImageStyle(args: {
  userId: string;
  imageStyle: string;
}): Promise<void> {
  await db.brandKit.update({
    where: { userId: args.userId },
    data: { imageStyle: args.imageStyle },
  });
}

// Inline palette edit — does NOT regenerate logos. SVGs use {{token}}
// placeholders so the new palette renders live.
export async function updateBrandKitPalette(args: {
  userId: string;
  palette: Partial<Palette>;
}): Promise<void> {
  const existing = await db.brandKit.findUnique({
    where: { userId: args.userId },
    select: { palette: true },
  });
  if (!existing) throw new Error("no brandkit to update");
  const merged = {
    ...(existing.palette as unknown as Palette),
    ...args.palette,
  };
  await db.brandKit.update({
    where: { userId: args.userId },
    data: { palette: merged as unknown as Prisma.InputJsonValue },
  });
}

export async function updateBrandKitTypography(args: {
  userId: string;
  typography: Partial<{
    headingFont: string;
    bodyFont: string;
    weights: string[];
  }>;
}): Promise<void> {
  const existing = await db.brandKit.findUnique({
    where: { userId: args.userId },
    select: { typography: true },
  });
  if (!existing) throw new Error("no brandkit to update");
  const merged = {
    ...(existing.typography as unknown as Record<string, unknown>),
    ...args.typography,
  };
  await db.brandKit.update({
    where: { userId: args.userId },
    data: { typography: merged as unknown as Prisma.InputJsonValue },
  });
}

export async function getBrandKit(userId: string) {
  return db.brandKit.findUnique({ where: { userId } });
}

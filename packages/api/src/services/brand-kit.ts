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

// Plan ceilings on brand-kit generations per 30 days. Tuned for
// 'reasonable iteration during initial setup' rather than 'one
// shot' — most users need 2-4 generations before they're happy
// with the direction, and gating that behind a paywall hurts onboarding.
export const MONTHLY_BRANDKIT_CAP: Record<Plan | "TRIAL", number> = {
  TRIAL: 5,
  SOLO: 10,
  TEAM: 30,
  STUDIO: 999,
  AGENCY: 999,
};

// Approximate per-generation cost (cents). Spec uses Sonnet; logos +
// graphics use Opus 4.7 with adaptive thinking for design-discipline
// reasons (a senior-designer model produces noticeably more restrained
// SVG geometry than a generalist mid-tier model). Used in UI quota line.
export const BRANDKIT_GENERATION_COST_CENTS = 30;

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

const SPEC_SYSTEM_PROMPT = `You are the visual director for a solopreneur's brand identity (think Collins, Pentagram, Order). You produce tight, deliberate specs — never generic, never trend-chasing, never 'modern minimalist startup look #347'.

PALETTE (6 hex colors, plus a rationale):
- Pick a defined direction — 'warm neutral with a single gold accent', 'cool ink with a vivid coral CTA', 'paper white with deep forest green' — and execute it.
- Avoid pure #000 and #FFF unless the brand demands it. Use #111 or #1A1815 for ink. Use #FAFAF7 or #F2ECE0 for paper.
- Roles:
  · primary: the dominant brand color used on CTAs and key UI accents
  · secondary: supporting color for secondary buttons / hover states
  · accent: a single sparing accent for status dots, gold trim, callouts (use sparingly!)
  · ink: text color (very dark — not pure black; #1A1815, #111, or similar)
  · surface: card / elevated surface fill (warm off-white in light brands, deep ink in dark brands)
  · bg: page background — always slightly different from surface (cooler or lighter)
- HARD CONTRAST RULE: ink vs bg and ink vs surface must each have a luminance gap > 0.6 (WCAG AA at large text). Don't ship a kit where ink is dark gray on light gray and the mark blends in.
- HARD ROLE RULE: primary, secondary, and accent must each be visually distinct from bg AND from surface — these are the colors that paint logos and graphics; if any of them blends with the canvas, the kit looks broken.
- Rationale should be one sentence connecting the palette to the brand voice / business.

TYPOGRAPHY (web-safe pairing + 2-3 weights + rationale):
Pick from this curated set, NOT a random Google font:
- 'Cormorant Garamond' (display) + 'Inter' (body) — editorial, considered, Aesop-adjacent
- 'Fraunces' (display) + 'Inter' (body) — modern serif, warm
- 'Playfair Display' (display) + 'IBM Plex Sans' (body) — classical, premium
- 'Inter' alone — clean, technical, default for SaaS / b2b
- 'DM Serif Display' + 'DM Sans' — geometric serif pairing
- 'Manrope' alone — soft sans, friendly
- 'IBM Plex Serif' + 'IBM Plex Sans' — institutional, editorial
- 'Söhne' or 'system-ui' alone — for stripped-down brands

IMAGE STYLE (1-2 sentence prompt fragment):
Specific photography terms — 'warm natural light filtered through linen', 'editorial documentary feel, desaturated color grading', 'overhead flat-lay, soft shadows'. Avoid 'beautiful' or 'professional' — those are noise.

LOGO CONCEPT (one short visual description, concrete enough to render as SVG):
Pick ONE direction. Avoid abstract phrasing like 'capturing the essence of...'.

Examples of strong concepts:
- 'a black sphere with a soft highlight, alive, breathing'
- 'a stylized house silhouette with vertical grid lines suggesting cabinetry interior, single accent dot at the apex'
- 'an O-shaped monogram with a thin vertical accent line through the center'
- 'three concentric arcs forming a stylized broadcast signal, single dot at the base'
- 'an A-shaped geometric monogram constructed from two diagonal lines and a horizontal crossbar in accent color'
- 'a minimalist eye composed of two arcs forming a lens, single accent pupil'

The concept must be specific, geometric, and renderable in 1–6 SVG primitives.`;

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
    const blockTypes = response.content.map((b) => b.type).join(",");
    throw new Error(
      `brandkit spec returned no text content (stop_reason=${response.stop_reason}, blocks=[${blockTypes}])`,
    );
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

const LOGO_SYSTEM_PROMPT = `You are a senior brand designer at a top studio (Pentagram / Collins / Order). You design logo marks that read as INTENTIONAL — every shape earns its place. Your output ships directly into the user's brand book without human cleanup.

DESIGN DISCIPLINE — read this before drawing anything:

1. ONE IDEA. Pick a single visual concept (a sphere, a house silhouette, a monogram letterform, a circular seal, an arc). Execute it precisely. Do NOT add decorative elements.
2. GEOMETRIC PRIMITIVES ONLY. Circles, rectangles, lines, polygons, simple paths with straight segments and arcs. No filigree, no swooshes, no fake-organic blobs.
3. FEW ELEMENTS. The 'mark' variant should be 1–6 SVG primitives total. Anything over 8 is too busy.
4. RESTRAINT. No gradients in the mark itself unless the concept REQUIRES dimension (a sphere needs radial gradient; a flat geometric mark does not). No drop shadows, no glows, no 3D bevels (except the sphere case).
5. NEGATIVE SPACE IS A FEATURE. Logos that breathe at 16px stay legible at 1200px.

REFERENCE QUALITY BAR — these are the standards your output is judged against:

A) Black sphere mark (concept: 'one entity, alive, calm'):
<svg viewBox="0 0 240 240"><defs>
  <radialGradient id="o" cx="30%" cy="25%" r="80%">
    <stop offset="0%" stop-color="#5a5a5a"/>
    <stop offset="35%" stop-color="#2a2a2a"/>
    <stop offset="100%" stop-color="#000"/>
  </radialGradient>
  <radialGradient id="h" cx="35%" cy="30%" r="20%">
    <stop offset="0%" stop-color="#fff" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
</defs>
<circle cx="120" cy="120" r="115" fill="url(#o)"/>
<ellipse cx="80" cy="72" rx="22" ry="14" fill="url(#h)" transform="rotate(-25 80 72)"/></svg>

B) House with cabinetry grid (concept: 'home, organized'):
<svg viewBox="0 0 240 240">
<path d="M30 130 L120 40 L210 130 L210 200 L30 200 Z" fill="none" stroke="{{ink}}" stroke-width="3" stroke-linejoin="round"/>
<line x1="74" y1="130" x2="74" y2="200" stroke="{{accent}}" stroke-width="2"/>
<line x1="120" y1="106" x2="120" y2="200" stroke="{{accent}}" stroke-width="2"/>
<line x1="166" y1="130" x2="166" y2="200" stroke="{{accent}}" stroke-width="2"/>
<line x1="30" y1="166" x2="210" y2="166" stroke="{{accent}}" stroke-width="2"/>
<circle cx="120" cy="40" r="5" fill="{{accent}}"/></svg>

C) Monogram 'O' (concept: 'circular, optical, optimized'):
<svg viewBox="0 0 240 240">
<circle cx="120" cy="120" r="80" fill="none" stroke="{{ink}}" stroke-width="14"/>
<line x1="120" y1="60" x2="120" y2="180" stroke="{{accent}}" stroke-width="3"/></svg>

D) Stacked arcs (concept: 'frequency, signal, broadcast'):
<svg viewBox="0 0 240 240">
<path d="M40 160 A80 80 0 0 1 200 160" fill="none" stroke="{{ink}}" stroke-width="4"/>
<path d="M64 160 A56 56 0 0 1 176 160" fill="none" stroke="{{ink}}" stroke-width="4"/>
<path d="M88 160 A32 32 0 0 1 152 160" fill="none" stroke="{{ink}}" stroke-width="4"/>
<circle cx="120" cy="160" r="6" fill="{{accent}}"/></svg>

NOTE the level of restraint in those references — that is the bar. Do not exceed it.

OUTPUT RULES:
- 5 SVG variants of the SAME logo concept.
- Square variants use viewBox="0 0 240 240". Wordmark uses viewBox="0 0 480 240".
- Self-contained (no external links/scripts). All <defs> inline.
- Color tokens — write {{primary}}, {{secondary}}, {{accent}}, {{ink}}, {{surface}}, {{bg}} LITERALLY in fill/stroke attributes. Never inline literal hex codes; the system replaces tokens at render time.
- No <image>, no <foreignObject>, no embedded fonts.
- Wordmark variant MUST include <text x="..." y="..." font-family="Inter, system-ui, sans-serif" font-weight="500" letter-spacing="-2" fill="{{ink}}"> with the business name in lowercase.
- Each SVG under 2000 chars. Every line should pull its weight.

VARIANTS:
- primary: the hero version. Background rect filling the viewBox in {{bg}} or {{surface}}, mark in {{ink}} (and optionally {{accent}}).
- mark: just the icon — no background rect, no text. Must be legible at 32px on screen. Use {{ink}} primarily, sparingly {{accent}}.
- monochrome: pure {{ink}} on transparent. NO use of {{accent}} — for embossing / single-color print.
- lightOnDark: {{ink}}-filled background rect, mark in {{surface}} or {{bg}} (light on dark inversion).
- wordmark: horizontal lockup — mark on the left (in the leftmost ~25% of the viewBox), business name to the right of it. 480×240.

CONTRAST DISCIPLINE — non-negotiable:
- The mark inside primary/lightOnDark must contrast STRONGLY with its background rect. If background is {{bg}} (light), the mark is {{ink}} (dark) — never {{surface}} on {{bg}}.
- {{accent}} is for one small detail (a dot, a single short line, ≤10% of the visible mark area). Never as the primary stroke color.
- Stroke widths on the mark: minimum 3 at viewBox 240×240. Hairlines at 1 disappear at favicon size.

If you find yourself adding 'sparkle' lines, sunbursts, or ribbons — stop. Delete them. The reference bar is no-decoration.`;

export async function generateLogoTemplates(args: {
  businessName: string;
  logoConcept: string;
  userId?: string;
}): Promise<z.infer<typeof LogoTemplatesSchema>> {
  const userMessage = `Business name: ${args.businessName}
Logo concept: ${args.logoConcept}

Generate the 5 SVG variants.`;
  // Opus 4.7 with adaptive thinking — these are creative/aesthetic outputs
  // where the higher-tier model produces noticeably more disciplined SVG
  // geometry. Adaptive thinking lets the model deliberate on the design
  // direction before drawing. Earlier runs at 12k truncated mid-output
  // (stop_reason=max_tokens) when thinking ate half the budget; cap is 24k.
  //
  // Failure mode worth handling: occasionally adaptive thinking still
  // consumes the entire budget and the response comes back with only a
  // 'thinking' block (no text). One automatic retry with thinking disabled
  // — deterministic completion, same prompt — recovers ~100% of these.
  //
  // Streaming is required: the SDK pre-flight rejects non-streaming
  // requests whose worst-case duration could exceed 10 minutes, and
  // 24k tokens + adaptive thinking on Opus 4.7 trips that check. We stream
  // and call `.finalMessage()` to assemble the same shape we'd otherwise
  // get from `.create()`.
  const callLogoModel = (withThinking: boolean) =>
    anthropic()
      .messages.stream({
        model: MODELS.OPUS,
        max_tokens: 24000,
        ...(withThinking ? { thinking: { type: "adaptive" as const } } : {}),
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
      })
      .finalMessage();

  let response = await callLogoModel(true);
  let block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    console.warn(
      `[brandkit] logo step returned no text on first pass (stop_reason=${response.stop_reason}, blocks=[${response.content.map((b) => b.type).join(",")}]); retrying without thinking`,
    );
    response = await callLogoModel(false);
    block = response.content.find((b) => b.type === "text");
  }
  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.STRATEGIST,
      eventType: "brandkit_logos",
      response,
    });
  }
  if (!block || block.type !== "text") {
    const blockTypes = response.content.map((b) => b.type).join(",");
    throw new Error(
      `logo generation returned no text content after retry (stop_reason=${response.stop_reason}, blocks=[${blockTypes}])`,
    );
  }
  return LogoTemplatesSchema.parse(JSON.parse(block.text));
}

const GRAPHICS_SYSTEM_PROMPT = `You are a senior editorial designer (think Pentagram book covers, MoMA exhibition posters, Aesop catalogue spreads). You compose hand-tuned SVG covers — geometric, restrained, intentional — for social headers, presentation slides, and business-card backs.

DESIGN DISCIPLINE:
1. EDITORIAL, NOT DECORATIVE. Every shape carries weight. No 'gradient mesh background' clip art.
2. GEOMETRIC PRIMITIVES. Circles, rectangles, lines, polygons, paths, arcs. Optional <pattern> for measured rhythm.
3. RESTRAINED PALETTE. Use 2–3 colors max from the brand palette. Don't deploy every token.
4. TYPOGRAPHIC IF IT SERVES. Optional large lowercase text element (<text>) using the brand name or a single editorial phrase, but only if it earns the canvas. font-family="Inter, system-ui, sans-serif".
5. NEGATIVE SPACE. Generous margins. The composition lives in the breathing room.

REFERENCE QUALITY BAR — three distinct aesthetics, all at this level of restraint:

A) Focal composition (one bold element + restraint):
<svg viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="{{bg}}"/>
<circle cx="600" cy="315" r="220" fill="{{ink}}"/>
<circle cx="600" cy="315" r="6" fill="{{accent}}"/>
<text x="600" y="540" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="500" letter-spacing="6" fill="{{ink}}">YOUR BRAND</text>
</svg>

B) Rhythmic grid (measured repetition):
<svg viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="{{surface}}"/>
<g stroke="{{ink}}" stroke-width="1.5" fill="none">
<line x1="100" y1="100" x2="100" y2="530"/>
<line x1="240" y1="100" x2="240" y2="530"/>
<line x1="380" y1="100" x2="380" y2="530"/>
<line x1="520" y1="100" x2="520" y2="530"/>
<line x1="660" y1="100" x2="660" y2="530"/>
<line x1="800" y1="100" x2="800" y2="530"/>
<line x1="940" y1="100" x2="940" y2="530"/>
<line x1="1080" y1="100" x2="1080" y2="530"/>
</g>
<circle cx="800" cy="315" r="80" fill="{{accent}}"/>
</svg>

C) Atmospheric / spatial (overlapping forms suggesting depth):
<svg viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="{{ink}}"/>
<path d="M-50 500 Q 600 200 1250 500" fill="none" stroke="{{accent}}" stroke-width="2"/>
<path d="M-50 550 Q 600 280 1250 550" fill="none" stroke="{{surface}}" stroke-width="2" stroke-opacity="0.4"/>
<path d="M-50 600 Q 600 360 1250 600" fill="none" stroke="{{surface}}" stroke-width="2" stroke-opacity="0.2"/>
<circle cx="950" cy="180" r="120" fill="{{surface}}" fill-opacity="0.06"/>
</svg>

OUTPUT RULES:
- 3 SVG compositions. Each viewBox="0 0 1200 630" (OG image / Twitter card proportions).
- Self-contained, no external links.
- Color tokens written literally: {{primary}}, {{secondary}}, {{accent}}, {{ink}}, {{surface}}, {{bg}}.
- No <image> tags, no <foreignObject>, no embedded fonts.
- Always fill the entire canvas with a {{bg}} or {{surface}} or {{ink}} rect — never leave it white.
- Each SVG under 5000 chars.

CONTRAST DISCIPLINE — non-negotiable:
- Foreground shapes MUST be on the opposite tone from the canvas fill.
- If canvas is light ({{bg}} or {{surface}}): foreground shapes must use {{ink}} or {{primary}}. Never use {{surface}} on {{bg}} (or vice versa) for major shapes — they're sibling light tones and the result is invisible.
- If canvas is dark ({{ink}}): foreground shapes must use {{surface}}, {{bg}}, or {{accent}}. Never use {{ink}} on {{ink}}.
- {{accent}} is for small punctuation (a dot, a single line, a 6–12% area) — never carries the composition by itself.
- Stroke widths: minimum 2 on text-card-sized canvases. A 0.5 hairline is invisible at thumbnail size.

VARIANTS (three distinct aesthetic directions):
- graphic1: focal composition — one bold shape with restrained supporting marks.
- graphic2: rhythmic / grid-based — measured repetition, editorial spread feeling.
- graphic3: atmospheric — overlapping curves or arcs suggesting depth and motion.

If you reach for a fancy gradient or a 'starfield' or a 'glassmorphism' panel — stop. Delete it. Return to primitives.`;

export async function generateBrandGraphics(args: {
  businessName: string;
  imageStyle: string;
  userId?: string;
}): Promise<z.infer<typeof BrandGraphicsSchema>> {
  const userMessage = `Business name: ${args.businessName}
Brand image style (for atmosphere — translate to vector geometry):
${args.imageStyle}

Generate the 3 SVG cover graphics.`;
  // Streaming required — same reason as the logo step (16k tokens + adaptive
  // thinking on Opus 4.7 can trip the SDK's 10-minute pre-flight check).
  const response = await anthropic()
    .messages.stream({
    model: MODELS.OPUS,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
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
    })
    .finalMessage();
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
    const blockTypes = response.content.map((b) => b.type).join(",");
    throw new Error(
      `graphics generation returned no text content (stop_reason=${response.stop_reason}, blocks=[${blockTypes}])`,
    );
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
  businessId?: string | null;
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

  // 3. Persist. With multi-business, BrandKit is keyed by businessId
  // (each Business has at most one live kit). Use the businessId
  // passed in (the active business at request time); fall back to the
  // user's currentBusinessId for legacy callers that don't pass one.
  let businessId = args.businessId ?? null;
  if (!businessId) {
    const userRow = await db.user.findUnique({
      where: { id: args.userId },
      select: { currentBusinessId: true },
    });
    businessId = userRow?.currentBusinessId ?? null;
  }
  const existing = await db.brandKit.findFirst({
    where: businessId ? { businessId } : { userId: args.userId },
  });
  const kit = existing
    ? await db.brandKit.update({
        where: { id: existing.id },
        data: {
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
          version: { increment: 1 },
          generatedAt: new Date(),
        },
      })
    : await db.brandKit.create({
        data: {
          userId: args.userId,
          businessId,
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
      });

  // Snapshot this generation as a BrandKitVersion so the user can come
  // back to it later. The live BrandKit row above mirrors the same data;
  // versions are an append-only history table.
  await db.brandKitVersion.create({
    data: {
      brandKitId: kit.id,
      version: kit.version,
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
  const [usedRaw, kit] = await Promise.all([
    db.agentEvent.count({
      where: {
        userId,
        eventType: "brandkit_generated",
        createdAt: { gte: since },
      },
    }),
    db.brandKit.findFirst({
      where: { userId },
      select: { logoTemplates: true },
    }),
  ]);

  // Migration amnesty: if the user's current kit has no svg logo
  // templates, their past generations were the old raster format that
  // got wiped by the schema migration. Don't penalize them for those —
  // they need a fresh generation to produce something usable on the
  // new format. We grant up to (used) free generations so a TRIAL user
  // can definitely regenerate at least once.
  const hasValidKit =
    !!kit?.logoTemplates &&
    Object.keys(kit.logoTemplates as Record<string, unknown>).length > 0;
  const used = hasValidKit ? usedRaw : 0;

  return {
    used,
    cap,
    remaining: Math.max(0, cap - used),
  };
}

export async function updateBrandKitImageStyle(args: {
  userId: string;
  businessId?: string | null;
  imageStyle: string;
}): Promise<void> {
  const kit = await db.brandKit.findFirst({
    where: args.businessId
      ? { businessId: args.businessId }
      : { userId: args.userId },
    select: { id: true },
  });
  if (!kit) throw new Error("no brandkit to update");
  await db.brandKit.update({
    where: { id: kit.id },
    data: { imageStyle: args.imageStyle },
  });
}

// Inline palette edit — does NOT regenerate logos. SVGs use {{token}}
// placeholders so the new palette renders live.
export async function updateBrandKitPalette(args: {
  userId: string;
  businessId?: string | null;
  palette: Partial<Palette>;
}): Promise<void> {
  const existing = await db.brandKit.findFirst({
    where: args.businessId
      ? { businessId: args.businessId }
      : { userId: args.userId },
    select: { id: true, palette: true },
  });
  if (!existing) throw new Error("no brandkit to update");
  const merged = {
    ...(existing.palette as unknown as Palette),
    ...args.palette,
  };
  await db.brandKit.update({
    where: { id: existing.id },
    data: { palette: merged as unknown as Prisma.InputJsonValue },
  });
}

export async function updateBrandKitTypography(args: {
  userId: string;
  businessId?: string | null;
  typography: Partial<{
    headingFont: string;
    bodyFont: string;
    weights: string[];
  }>;
}): Promise<void> {
  const existing = await db.brandKit.findFirst({
    where: args.businessId
      ? { businessId: args.businessId }
      : { userId: args.userId },
    select: { id: true, typography: true },
  });
  if (!existing) throw new Error("no brandkit to update");
  const merged = {
    ...(existing.typography as unknown as Record<string, unknown>),
    ...args.typography,
  };
  await db.brandKit.update({
    where: { id: existing.id },
    data: { typography: merged as unknown as Prisma.InputJsonValue },
  });
}

// Prefer businessId when available — multi-business users have one
// kit per business. Falls back to userId for legacy callers.
export async function getBrandKit(args: {
  userId: string;
  businessId?: string | null;
}) {
  return db.brandKit.findFirst({
    where: args.businessId
      ? { businessId: args.businessId }
      : { userId: args.userId },
  });
}

// All historical versions of the active business's brand kit, newest
// first. Used to render the 'history' panel — every entry is restorable.
export async function listBrandKitVersions(args: {
  userId: string;
  businessId?: string | null;
}) {
  const kit = await db.brandKit.findFirst({
    where: args.businessId
      ? { businessId: args.businessId }
      : { userId: args.userId },
    select: { id: true },
  });
  if (!kit) return [];
  return db.brandKitVersion.findMany({
    where: { brandKitId: kit.id },
    orderBy: { version: "desc" },
  });
}

// Copy a past version's data into the live BrandKit row. Doesn't burn a
// regeneration credit — restoring is free since no LLM call happens.
// Bumps the version number forward (so e.g. restoring v2 over v5 makes
// the live row v6, which is itself snapshotted as a new version row).
export async function restoreBrandKitVersion(args: {
  userId: string;
  businessId?: string | null;
  versionId: string;
}): Promise<{ newVersion: number }> {
  const kit = await db.brandKit.findFirst({
    where: args.businessId
      ? { businessId: args.businessId }
      : { userId: args.userId },
    select: { id: true, version: true },
  });
  if (!kit) throw new Error("no brandkit to restore into");

  const target = await db.brandKitVersion.findFirst({
    where: { id: args.versionId, brandKitId: kit.id },
  });
  if (!target) throw new Error("version not found");

  const newVersion = kit.version + 1;
  await db.$transaction([
    db.brandKit.update({
      where: { id: kit.id },
      data: {
        palette: target.palette as Prisma.InputJsonValue,
        typography: target.typography as Prisma.InputJsonValue,
        logoTemplates: target.logoTemplates as Prisma.InputJsonValue,
        coverSamples: target.coverSamples as Prisma.InputJsonValue,
        imageStyle: target.imageStyle,
        logoConcept: target.logoConcept,
        voiceTone: (target.voiceTone ?? Prisma.DbNull) as Prisma.InputJsonValue,
        version: newVersion,
        generatedAt: new Date(),
      },
    }),
    db.brandKitVersion.create({
      data: {
        brandKitId: kit.id,
        version: newVersion,
        palette: target.palette as Prisma.InputJsonValue,
        typography: target.typography as Prisma.InputJsonValue,
        logoTemplates: target.logoTemplates as Prisma.InputJsonValue,
        coverSamples: target.coverSamples as Prisma.InputJsonValue,
        imageStyle: target.imageStyle,
        logoConcept: target.logoConcept,
        voiceTone: (target.voiceTone ?? Prisma.DbNull) as Prisma.InputJsonValue,
      },
    }),
  ]);

  return { newVersion };
}

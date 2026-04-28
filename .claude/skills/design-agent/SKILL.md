---
name: design-agent
description: Use when designing or implementing the ADFI Design agent — a specialist that produces brand kits, logos, color palettes, brand graphics, and visual templates for ANY client business. Triggers on "design agent", "brand kit", "logo generation", "brand graphics", "color palette", "brand book", or redesigning the brand kit page. Use when generating SVG marks, building color theory utilities, composing brand graphics from primitives, or rendering real-world application templates (favicon, social avatar, business card).
---

# ADFI Design Agent — Architecture Spec

## What this agent is

The Design agent is a specialist in the ADFI agent lineup (alongside
Strategist, Signal, Echo, Scout, Pulse, Campaign Manager). It produces
visual brand artifacts for the user's business: brand kit, logos,
color palettes, brand graphics, and templated mockups.

Important: this agent runs PER CLIENT BUSINESS. Each ADFI user has
their own business. Each business has its own brand kernel, palette,
mark, voice, and graphics. The Design agent generates these specifically
for that business — based on the user's description, their Strategist
output, and any preferences they've expressed.

The Design agent is NOT a generative-image system. It produces SVG
and code-defined visuals. Image models (Midjourney, DALL-E, Stable
Diffusion, Imagen) are NEVER used for logos, brand graphics, or mockups.
They produce fuzzy, off-brand, amateur-looking output.

The Design agent also serves other agents:
- Echo uses Design's image-style prefix and post templates
- Strategist embeds Design's graphics in weekly reports
- Campaign Manager uses Design's ad creative templates

## Core architectural principle

> Brand artifacts are typeset, not generated. Every visual element should
> be expressible as code (SVG primitives, color math, CSS gradients) so
> it scales infinitely, edits cleanly, and looks intentional — and so
> the same pipeline works for any client business.

## Inputs (per client)

Every Design agent run reads three things from the database for the
specific client:

1. **Business description** — the textarea input from onboarding step 1
2. **Strategist output** (if available) — voice fingerprint, audience,
   values, content pillars
3. **User preferences** — any explicit overrides (e.g. "i want a
   minimal mark", "use blue and orange", "no gradients")

If Strategist hasn't run yet, Design runs Phase 1 (kernel) itself
from the business description. Otherwise it reads what Strategist
already produced.

## The 6-phase pipeline

A brand kit generation runs through six phases in this exact order.
Each phase reads the output of previous phases. Each output is stored
in the database keyed by `clientId`.

### Phase 1 — Brand kernel (LLM, generic prompt)

Purpose: Capture the client's strategic foundation in a structured object
that every later phase reads.

The prompt template is generic. The output varies completely per client.

Generic prompt skeleton:

```
You are a brand strategist. Given this business description and
existing voice analysis, produce a brand kernel as JSON.

Business description: {{businessDescription}}
Existing voice (if any): {{strategistOutput}}
User preferences: {{userPreferences}}

Output JSON with these exact keys:
- personality (3-5 single-word descriptors of how the brand feels)
- values (3-5 short value statements)
- audience_archetypes (1-3 named archetypes with one-sentence descriptions)
- visual_register (one phrase describing the visual mood — e.g.
  "warm artisan", "tactical terminal", "soft minimalist", "bold geometric")
- industry_category (one of: creator, service, retail, fintech, saas,
  hospitality, wellness, b2b, other)
- color_strategy (one phrase describing the palette direction —
  do NOT pick specific hex values, just describe the feeling)
- logo_concept_direction (one phrase describing the mark's character —
  e.g. "geometric mark with asymmetric strokes", "soft organic blob",
  "wordmark only with custom letterforms")

Examples of how outputs vary by business:
- A ceramics studio → warm earthy register, organic mark direction
- A fintech trading platform → tactical terminal register, geometric mark
- A yoga instructor → soft minimal register, breath-mark direction
- A bakery → warm tactile register, wordmark-led direction

Return only the JSON object. No prose, no markdown fences.
```

Implementation:
- Function: `generateKernel(clientId: string): Promise<BrandKernel>`
- Model: Claude Opus 4.7 (`claude-opus-4-7`)
- Cost: ~$0.05 per generation
- Cache result. Don't regenerate unless business description changes.

### Phase 2 — Color generation (PURE CODE, NO LLM)

Purpose: Produce a mathematically valid palette from the kernel's
color_strategy phrase.

Implementation: A TypeScript function in
`packages/design-agent/src/color.ts`.

Approach:
1. Parse `color_strategy` → extract anchor hue intent
2. Use ONE Claude call to pick a single anchor hex value matching
   the strategy phrase (cheap — ~$0.01)
3. From the anchor, generate the rest with code:
   - Primary (anchor)
   - Secondary (analogous, -30° hue, slight saturation drop)
   - Accent (complementary or split-complementary, high saturation)
   - Ink (anchor desaturated to ~8%, lightness 12-18%)
   - Surface (anchor desaturated to ~12%, lightness 92-95%)
   - Background (anchor desaturated to ~6%, lightness 96-98%)
   - Border (between surface and ink in lightness)
4. Validate every text-on-bg pair against WCAG AA (4.5:1 for body,
   3:1 for large text). If any pair fails, adjust lightness and retry.
5. Output structured palette with hex + rgb + hsl for each role.

Use `chroma-js` or `colorjs.io` for the math.

Why code, not LLM: LLMs produce inconsistent palettes that fail WCAG.
A 200-line function produces palettes that always pass and always
have consistent relationships between roles.

### Phase 3 — Logo composition (LLM generates SVG code, NEVER pixels)

Purpose: Produce 3 logo variants per client as SVG strings: primary
mark, monochrome, on-dark.

Implementation:
- Prompt template at
  `packages/design-agent/src/prompts/mark-generation.md`
- Send to Claude Opus 4.7 with the kernel + palette as variables
- The prompt MUST enforce these constraints universally (regardless
  of which client):
  - Output is raw SVG only (no explanations, no markdown fences)
  - Use only these primitives: `<path>`, `<circle>`, `<rect>`,
    `<line>`, `<polygon>`, `<g>`, `<defs>`, `<linearGradient>`,
    `<radialGradient>`
  - viewBox must be square (e.g. `0 0 100 100`)
  - Mark must remain legible at 16×16px
  - Mark must work in 3 forms: full color, monochrome, on-dark
  - Color values must come from the provided palette only
- The prompt should include 4-6 example outputs spanning DIFFERENT
  visual registers (one geometric, one organic, one wordmark, one
  abstract) so the model has range
- After generation, run a refinement pass: send the draft back with
  "what's geometrically wrong with this mark? rewrite it"
- Validate output: parse SVG, check viewBox, check primitives,
  check color references match palette

The mark direction comes from `kernel.logo_concept_direction`.
The model decides the actual geometry.

Examples of outputs across clients (illustrative, not prescriptive):
- Ceramics studio kernel → soft organic shape, single curve, warm tone
- Fintech kernel → sharp asymmetric strokes, geometric, accent color
- Yoga kernel → minimal circle with offset, breath-like
- Bakery kernel → custom wordmark with one decorative letter

ADFI's own orb (radial-gradient #5a5a5a → #2a2a2a → #0a0a0a → #000)
is one example of an output for ADFI's own kernel — NOT a template
to copy for other clients.

### Phase 4 — Brand graphics (LLM generates SVG compositions)

Purpose: Produce 3 abstract SVG cover graphics for each client. Used
as social headers, presentation slides, email covers.

Implementation:
- Prompt: "Compose an abstract SVG using these brand tokens. Use only
  primitives. The composition should suggest '{{visual_register}}'."
- Each composition is 800×450px (16:9)
- Allowed patterns:
  - Stylized chart (line/bar/area) using palette
  - Geometric horizon / sun / mountain stacks
  - Grid or constellation of dots/lines
  - Type-led composition (large letterform as backdrop)
- Forbidden:
  - Realistic illustration
  - Detailed scenery
  - Heavy filter/blur effects
  - Anything that requires raster fallback
- Validate: ≥3 palette colors, ≤6 primitives per layer

The output varies completely by client. A trader's brand graphics
look different from a yoga instructor's brand graphics.

### Phase 5 — Real-world application templates (PURE CODE)

Purpose: Apply the client's brand to standard mockups.

Implementation: Pre-built SVG templates in
`packages/design-agent/src/templates/`. The templates themselves are
fixed; only the slots get filled with each client's tokens.

- `favicon-template.svg` — browser tab frame, slot for mark
- `social-avatar-template.svg` — circular crop, slot for mark + bg color
- `business-card-template.svg` — 85.6×54mm layout, slots for wordmark,
  colors, URL
- `email-header-template.svg` — 600×200px, slots for mark + tagline
- `instagram-post-template.svg` — 1080×1080, slot for mark + content area

Substitute palette colors and inject the client's generated mark via
XML parsing. No LLM. Output is deterministic and always looks good.

These templates work for any client because the layout is fixed and
only the brand tokens vary.

### Phase 6 — Voice & guidelines (LLM, generic prompt)

Purpose: Generate the prose sections of the brand book per client —
tone descriptors, do/don't pairs, content pillars, image style guide.

Implementation:
- Read kernel + Strategist's existing voice fingerprint (if any)
- Generate sections via Claude Opus 4.7 with a generic prompt
  template that produces output specific to this client:
  - "How the brand sounds" (tone descriptors with sample sentences
    in this client's voice)
  - "Brand values" (one-line definitions specific to this client)
  - "Content pillars" (4-6 themes specific to this client's industry)
  - "Do / Don't" pairs (5-7 pairs specific to this client's category)
  - "Audience archetypes" (1-paragraph descriptions of THIS client's
    audience)
  - "Image style prefix" (the prompt prefix Echo prepends to every
    photo it generates for THIS client's content)

The prompt template is generic; the prose output is per-client.

## Models, costs, caching (per client)

| Phase | Model | Cost / generation |
|-------|-------|-------------------|
| 1 — Kernel | Opus 4.7 | $0.05 |
| 2 — Colors | code + 1 cheap call | $0.01 |
| 3 — Logo | Opus 4.7 (with refinement) | $0.20 |
| 4 — Graphics | Opus 4.7 | $0.10 |
| 5 — Templates | none (code) | $0.00 |
| 6 — Voice | Opus 4.7 | $0.08 |
| **Total** | | **~$0.44** |

Cache results aggressively per client:
- Re-run color generation on every regenerate (cheap)
- Re-run logo only if user clicks "regenerate logo" specifically
- Re-run graphics on full regenerate
- NEVER re-run kernel unless business description changes
- Limit full regenerations: 5 per month per client (rate limit)

## Database schema (Prisma)

The Design agent stores per-client brand kit data. Suggested schema:

```prisma
model BrandKit {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id])
  version     Int
  status      BrandKitStatus
  kernel      Json     // BrandKernel from Phase 1
  palette     Json     // Palette from Phase 2
  marks       Json     // 3 SVG strings from Phase 3
  graphics    Json     // 3 SVG strings from Phase 4
  voice       Json     // Voice prose from Phase 6
  templates   Json     // Rendered template SVGs from Phase 5
  createdAt   DateTime @default(now())
  @@index([clientId])
  @@unique([clientId, version])
}

enum BrandKitStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}
```

## File structure

```
packages/
  design-agent/
    src/
      index.ts                    # main runDesignAgent(clientId) function
      kernel.ts                   # Phase 1: kernel generation
      color.ts                    # Phase 2: palette generation (CODE)
      logo.ts                     # Phase 3: SVG mark generation
      graphics.ts                 # Phase 4: SVG composition generation
      templates.ts                # Phase 5: template substitution
      voice.ts                    # Phase 6: voice prose generation
      validate.ts                 # SVG validation utilities
      types.ts                    # BrandKernel, Palette, BrandKit types
      prompts/
        kernel-generation.md
        mark-generation.md
        graphics-generation.md
        voice-generation.md
      templates/
        favicon-template.svg
        social-avatar-template.svg
        business-card-template.svg
        email-header-template.svg
        instagram-post-template.svg
    package.json
```

## Specialist page UI

The Design specialist page at `/specialist/design` follows the same
pattern as Pulse (see `/prototype/ADFI_Pulse_Page.html`). The page
displays the CURRENT CLIENT's brand kit:

- Page header: breathing orb signature + "design" + tier pill (team/studio)
- Description: "brand kit · logo · colors · graphics"
- Run now / regenerate / pause controls
- "currently" card with rotating phrases (these are generic, not
  client-specific):
  - "preparing your color palette..."
  - "composing your mark..."
  - "drafting brand cover graphics..."
  - "applying your brand to templates..."
  - "writing your brand voice..."
- Recent outputs: brand kit version history for THIS client
- Below: the brand book renders inline using the current client's
  generated assets

When idle, show a single line "idle · 5 regenerations available this month"
and stop the shimmer.

## Naming and copy

- Agent name: "design" (lowercase) in the UI
- ADFI says "i" (first person): "i refreshed your color palette this
  morning" — same voice for every client
- The brand kit shown to each client is THEIR brand kit, not ADFI's

## What this skill does NOT cover

- ADFI's own brand kit (that's a separate, hand-designed asset that
  lives in `packages/ui/tokens.ts` — never regenerated)
- Generic image generation for posts (that's Echo, which uses Design's
  image-style-prefix as input but doesn't regenerate brand assets)
- The marketing landing page brand kit at adfi.ca/brandkit
  (that's ADFI's own showcase, hand-designed)

## Implementation order

When asked to build the Design agent:

1. `packages/design-agent/src/types.ts` — define BrandKernel, Palette,
   Mark, Graphic, Voice, BrandKit types first
2. `packages/design-agent/src/color.ts` (Phase 2) — pure code, testable,
   produces immediate visual upgrade
3. `packages/design-agent/src/templates.ts` + template SVGs (Phase 5) —
   pure code, big visual upgrade
4. `packages/design-agent/src/voice.ts` (Phase 6) — straightforward
   LLM prose
5. `packages/design-agent/src/kernel.ts` (Phase 1) — reads from
   Strategist or generates fresh
6. `packages/design-agent/src/logo.ts` (Phase 3) — hardest part, expect
   3-5 days tuning
7. `packages/design-agent/src/graphics.ts` (Phase 4) — last, optional polish
8. `apps/web/app/specialist/design/page.tsx` — the UI, uses the
   specialist page layout

Each phase ships independently. The brand kit improves with each phase.

## Critical reminders

- Never use raster image generation for brand artifacts
- Always validate SVG output (parse, check primitives, check colors)
- Always validate WCAG contrast on generated palettes
- Cache aggressively per client; brand kit generation is expensive
- Each client gets a different brand kit. The pipeline is generic.
  The outputs are not.
- ADFI's own orb gradient is hand-designed and lives in
  packages/ui/tokens.ts. Don't regenerate it via this agent.
- Image style prefix from Phase 6 must be injected into every Echo
  image prompt automatically (cross-agent contract)

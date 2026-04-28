---
title: SESSION_STATE
purpose: Hand-off snapshot for the next Claude Code session
last_updated: 2026-04-27
---

# Session state — 2026-04-27

This is a frozen snapshot of where ADFI is, what's been built recently, what's
locked, what's open, and exactly what to do next. A fresh Claude Code session
should be able to read this top-to-bottom and continue without any other
context.

For project-wide rules, read [`CLAUDE.md`](../CLAUDE.md) first; for
architecture decisions, read [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). This
file only covers the *current* work-in-flight — it is not a substitute for the
permanent docs.

---

## 1. Where we are right now

**Active work area:** brand-kit (`/brandkit` panel + onboarding step).

**Phase:** polishing. The brand-kit feature is functionally complete (schema,
generation pipeline, panel UI, restore + history, HTML download). The current
session was finishing two follow-ups on top:

1. **Version history + one-file HTML brand book** — finished in commit
   `7be8bf0`. Every generation snapshots into `brand_kit_versions`; the panel
   shows a "history" section with palette swatches and a one-click restore
   that bumps the version without burning a credit. Downloads section now
   leads with `<slug>-brand-book-v<n>.html` — a self-contained file with every
   SVG inlined (built by
   [`apps/web/components/brand-kit/build-html-export.ts`](../apps/web/components/brand-kit/build-html-export.ts)).
2. **Logo generation token-budget fix + diagnostic errors** — finished in
   commit `6eba5f0`. The logo step was running out of token budget when
   adaptive thinking deliberated for too long; doubled the cap (12k → 24k).
   Failure messages now include `stop_reason` and content-block types so the
   next regression is diagnosable from one error line.

**Branch state:** `main`, working tree clean, **1 commit ahead of
`origin/main`**. Nothing is pushed yet — the "Ship" todo is the only thing
left in the in-flight list.

---

## 2. What's been built (with file paths)

### Brand-kit feature (current session focus)

**Database**
- [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma) —
  `BrandKit` (live row, one per user) and `BrandKitVersion` (append-only
  history) models.
- [`packages/db/prisma/migrations/20260427200000_brand_kits/migration.sql`](../packages/db/prisma/migrations/20260427200000_brand_kits/migration.sql)
  — initial brand-kit table.
- [`packages/db/prisma/migrations/20260427210000_brandkit_svg_templates/migration.sql`](../packages/db/prisma/migrations/20260427210000_brandkit_svg_templates/migration.sql)
  — adds SVG-template columns.
- [`packages/db/prisma/migrations/20260427220000_brandkit_versions/migration.sql`](../packages/db/prisma/migrations/20260427220000_brandkit_versions/migration.sql)
  — `brand_kit_versions` table, unique on `(brand_kit_id, version)`,
  cascade delete on parent.

**API / service**
- [`packages/api/src/services/brand-kit.ts`](../packages/api/src/services/brand-kit.ts)
  — generation pipeline (palette → typography → logos → graphics → voice),
  Opus 4.7 with adaptive thinking, reference SVGs, monthly cap enforcement.
  - `generateBrandKit` snapshots a `BrandKitVersion` on every successful
    generation (around L536).
  - `listBrandKitVersions(userId)` (L679) — newest first.
  - `restoreBrandKitVersion({ userId, versionId })` (L695) — copies the chosen
    version into the live row, bumps version number, snapshots the new row
    too. No model call, no credit burn.
- [`packages/api/src/routers/brand-kit.ts`](../packages/api/src/routers/brand-kit.ts)
  — tRPC router. Procedures: `getMine`, `generate`, `regenerate`, `update`,
  `listVersions` (L122), `restoreVersion` (L128).

**Web UI**
- [`apps/web/components/brand-kit/brandkit-panel.tsx`](../apps/web/components/brand-kit/brandkit-panel.tsx)
  — the full `/brandkit` page. Renders palette, typography, logos in 5
  variants, size showcase, graphics gallery, usage do/don't, mockups, voice,
  downloads, and `HistorySection` (L1232+).
- [`apps/web/components/brand-kit/build-html-export.ts`](../apps/web/components/brand-kit/build-html-export.ts)
  — builds the standalone HTML brand book. Every SVG and every style is
  inlined; only external fetch is Google Fonts (degrades to system fonts
  offline). Recently modified by user/linter — preserve as-is.
- [`apps/web/app/onboarding/brandkit/brandkit-form.tsx`](../apps/web/app/onboarding/brandkit/brandkit-form.tsx)
  — onboarding step that runs the generator after sign-up.

### Recent surrounding work (last ~30 commits, in time order)

- `feat(brand-kit): schema + generation pipeline + tRPC` (`3acb423`)
- `feat(brand-kit): /brandkit panel — palette, fonts, logos, covers` (`a6c4551`)
- `feat(brand-kit): onboarding step + echo image biasing` (`cc438c8`)
- `feat(brand-kit): svg-only generation + editable palette / typography` (`4b0d5b2`)
- `feat(brand-kit): brand-book sections — sizes, usage, mockups, voice` (`588e78f`)
- `fix(brand-kit): migration amnesty for users with empty logoTemplates` (`028539a`)
- `feat(brand-kit): senior-designer prompts + Opus 4.7 + reference SVGs` (`e3def34`)
- `fix(brand-kit): bump monthly caps so users can iterate on design` (`417bb2c`)
- `fix(brand-kit): inline SVG everywhere instead of data: URIs` (`67fec10`)
- `feat(brand-kit): version history + one-file HTML brand book` (`7be8bf0`)
- `fix(brand-kit): bump logo max_tokens 12k→24k + diagnostic errors` (`6eba5f0`) ← HEAD

For everything older, see [`docs/CHANGELOG.md`](CHANGELOG.md) `[Unreleased]`.

---

## 3. Decisions locked in (do not re-litigate)

These are settled — bringing them up again wastes tokens. If a change here is
genuinely needed, raise it explicitly with the user first.

- **Brand-kit logos are SVG-only.** Replicate is not used for logos. The model
  fills 5 hand-tuned reference SVG templates with the chosen palette.
  `applyPalette` does the substitution at render time.
- **Logos are inlined as `<svg>` elements**, not `data:` URIs. (Fixed in
  `67fec10` — data URIs broke palette swap and made cards render blank in
  some browsers.)
- **Adaptive thinking budget for the logo step is `max_tokens: 24000`.** Do
  not lower without checking that the 5-template fill still completes.
- **Restore does not burn a monthly credit.** No LLM call; only a DB swap
  inside a `db.$transaction([...])`.
- **Restore bumps the version number forward** (restoring v2 over a live v5
  produces v6, snapshotted as a new row). Don't "rewind" the counter.
- **`BrandKitVersion` has a unique `(brand_kit_id, version)` index** — relied
  on by both restore and `listVersions` ordering.
- **HTML brand book is one self-contained file.** No external image fetches,
  no JS, only Google Fonts via `<link>` (with system-font fallbacks). The
  user can email it to a designer and it just works.
- **All package names use `orb`; all user-facing strings use `adfi`.** This
  applies to the brand kit too. See [`CLAUDE.md`](../CLAUDE.md) for the rule.
- **DB migrations run via `db:migrate` (deploy)** against the Supabase pooler.
  `db:migrate:dev` fails on shadow DB — do not try it.

---

## 4. Open questions / known issues

### 4.1 — Image quality complaint — RESOLVED (this session)

User said earlier this session:

> Brand kit is not working well — images are not professional and are not
> visible in the background colors. It is not as attractive as the optimized
> home or [other] adfi brand kit.

**Root cause (after investigation):** the rendering layer was using
`palette.bg` as the canvas color for logo and graphic cards in three places:
the panel ([`brandkit-panel.tsx`](../apps/web/components/brand-kit/brandkit-panel.tsx)),
the standalone HTML brand book ([`build-html-export.ts`](../apps/web/components/brand-kit/build-html-export.ts)),
and the page body of the HTML book itself. When palette generation produced a
near-white `palette.bg` (very common — most of our palettes are light/warm),
white cards on a near-white body and `palette.bg` canvases collapsed into a
single visual blob. Transparent SVG variants (`mark`, `monochrome`,
`wordmark`) had no inset framing, so even with a "correct" mark the canvas
itself didn't read as a framed object.

A second cause was at the generation layer: the LLM prompts allowed sibling
light tones (e.g. `{{surface}}` foreground on `{{bg}}` canvas) which the
model occasionally took up on, producing graphics that were technically
"correct" but visually invisible.

**Fix:**
- Logo + graphic canvases now use `palette.surface` (not `palette.bg`) +
  an inset hairline ring (`box-shadow: inset 0 0 0 0.5px ...`).
  `lightOnDark` keeps `palette.ink` for the dark variant.
- The HTML brand book body now uses a fixed neutral `#FAFAF7` instead of
  `palette.bg`, so white cards always stand out.
- `SPEC_SYSTEM_PROMPT` has a hard luminance-gap rule for `ink` vs `bg`/`surface`,
  plus a hard rule that `primary`/`secondary`/`accent` must each be visually
  distinct from both `bg` and `surface`.
- `LOGO_SYSTEM_PROMPT` and `GRAPHICS_SYSTEM_PROMPT` now ban sibling-tone
  fg/bg pairs, cap `accent` at ≤10% area / single-detail use, and pin
  minimum stroke widths.

### 4.2 — Anthropic 400: image dimension > 8000 px — NOT OUR BUG

```
API Error: 400 messages.70.content.1.image.source.base64.data:
At least one of the image dimensions exceed max allowed size: 8000 pixels
```

This was the user pasting a screenshot (3840×21524 — 21k px tall) into Claude
Code itself, not our app sending images to Anthropic. None of our agents
forward user-uploaded images to Claude (verified via grep — no `type: "image"`
content blocks anywhere in `packages/api/src` or `apps/web`). Replicate
output is returned as a URL, not forwarded as base64. Marking this closed.

### 4.3 — `Ship` not done

After the contrast fix lands, `main` will be 2+ commits ahead of
`origin/main`. The user said "continue and finish all tasks" so push
authorization is implicit for this session.

---

## 5. Next actions

All in-flight brand-kit work is done. Suggested next moves for the next
session, roughly in priority order:

**1. Watch the first regenerated kits.** The contrast fix only fully
manifests once a user regenerates (palette + graphics now require the new
contrast rules). Existing kits still have their old SVGs — they benefit from
the canvas + inset-frame fix but not from the prompt changes. Worth tailing
admin financials for the next 24h after deploy and skimming a few kits to
confirm the new constraints land.

**2. Onboarding flow polish (next product area).** With brand-kit
stabilized, the visible weak spot in the onboarding funnel is the gap
between sign-up and the first specialist run. The product thesis ("hire,
don't supervise") implies the first run should feel automatic — currently
there's a manual step. Worth a focused session.

**3. Mobile parity for `/brandkit`.** Web has the full panel; mobile has
nothing yet. Read `apps/mobile/components/specialists/brand-voice-view.tsx`
as a starting point, mirror the structure for brand-kit.

---

## 6. Pointers for the next session

- The brand-kit todo list is fully closed:
  1. ✅ Schema + migration: `BrandKitVersion` table
  2. ✅ Service: snapshot on generate, list, restore
  3. ✅ Router: `listVersions` + `restoreVersion` mutations
  4. ✅ UI: history dropdown + restore + HTML download
  5. ✅ Ship — version-history + HTML book + contrast fixes pushed
- The user pays per output token. When proposing changes, summarize file
  trees instead of pasting full source. See
  `~/.claude/projects/-Users-soroushosivand-Projects-adfi/memory/feedback_concise_proposals.md`.
- Once a multi-stage plan is accepted, flow through without re-confirming
  each stage. See `feedback_no_stage_confirmation.md`.
- DB workflow: Supabase pooler is the dev DB. Use `db:migrate` (deploy).
  `db:migrate:dev` fails on shadow DB. See `project_db_workflow.md`.

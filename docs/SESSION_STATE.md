---
title: SESSION_STATE
purpose: Hand-off snapshot for the next Claude Code session
last_updated: 2026-05-01 (night)
---

# Session state — 2026-05-01 (night)

Frozen snapshot of where ADFI is, what's been built, what's locked, what's
open, and exactly what to do next. A fresh Claude Code session should be
able to pick up by reading this top-to-bottom.

## Latest session (2026-04-30 → 05-01) — content + motion-reel rewrite

Three big things shipped:

**1. Motion-reel scene-script architecture (was single-template).** The
video agent now writes a sequence of 3-7 scenes (hook · stat · contrast ·
quote · punchline · list · hashtags · brand-stamp) that play back-to-back
via Remotion `<Sequence>`. Switched the agent from Sonnet to Haiku 4.5 +
prompt caching the long system prompt — per-video cost dropped from ~2¢
to ~1.1¢ at scale, ~0.4¢ within AWS Lambda free tier. 6 industry preview
scripts (renovation 50s, fitness, legal/tax, restaurant, SaaS, copy-trading)
in `packages/motion-reel/src/previews/` for studio iteration without
burning tokens.

**2. Content page redesign.** /content rebuilt around three ideas:
  - Big focused GenerateBar at top (textarea + collapsed format/platform
    pickers + draft button). OrbLoader takes over while Echo drafts.
  - Platform-authentic mockups (instagram-post, instagram-reel,
    twitter, linkedin, facebook, telegram, email — see
    apps/web/components/content/mockups/) instead of generic text rows
  - DraftCardV2 wraps the mockup with single-primary-action ladder per
    state (approve / regenerate / add-photos / view-live / retry) +
    overflow menu for tertiary actions
  - Tabs back: feed / week / performance as a quiet link strip
  - In-app script preview drawer via Remotion `<Player>` — free
    browser playback before paying for Lambda render

**3. Critical prod fix.** prisma.business.create() was failing in tRPC
middleware for fresh Supabase users (FK violation on user_id) — locked
users out of dashboard with no way to even sign out. Fixed by upserting
the User row before business.create.

Also: admin dashboard period selector (default 30d, was hard-coded
this-month and showed empty grid on May 1st), .env.example refreshed
for SendGrid + Remotion Lambda env vars, error swallowing for third-
party quota failures with admin-notify URGENT tags, persisted Meta user
token + DELETE /me/permissions on disconnect, IG webhook subscribe
fixes, mobile burger menu + profile dropdown on landing.

Skill `~/.claude/skills/video-agent/SKILL.md` updated with scene
catalog, cost model, in-app preview pattern, and adding-new-scene
workflow.

For project-wide rules, read [`CLAUDE.md`](../CLAUDE.md). For architecture,
read [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). For the agent workflow,
[`docs/ECHO_WORKFLOW.md`](ECHO_WORKFLOW.md). For the multi-business
foundation specifically, see "Multi-business" section below.

---

## 1. Project status

**Phase:** pre-launch / private development. No real users. **Vercel Pro**
(upgraded from Hobby on 2026-04-28 after a stuck deploy webhook on Hobby
— see CHANGELOG `Changed (vercel · 2026-04-28)`). The user (Soroush) is
testing personally; one test user (`maya@ceramicsco.example`) was
previously seeded then deleted.

**Active branch:** `main`. Production at `https://www.adfi.ca`. Mobile app
exists in `apps/mobile` (Expo) but is not yet in the App Store / Play Store.

**Recent direction (2026-04-28 evening):** the design system is moving from
"LLM generates everything" to "LLM picks direction, code does the rest"
— `@orb/design-agent` shipped its pure-code phases (palette + templates).
Specialist pages were redesigned per the Pulse prototype. Brand-kit caps
were right-sized after the user flagged 999/STUDIO as economically broken.
Next direction: **motion-reel package** (code-as-video using the
landing-page scene templates as reference).

---

## 2. What's been built end-to-end

### Pricing reshape (2026-04-28)

| Plan | Businesses | Credits | Calls/mo | Price |
|---|---|---|---|---|
| TRIAL (7 days) | 1 | 50 | 5 | $0 |
| SOLO | 1 | 60 | 0 (DMs only) | $29 |
| TEAM ★ | 1 | 250 | 100 | $79 |
| STUDIO | 2 | 600 shared | 250 | $199 |
| AGENCY | 8 | 2000 shared | 600 | $499 |

Each upgrade unlocks a *capability gate*, not just more credits:
- SOLO → TEAM unlocks **voice calls + web research + priority queue**
- TEAM → STUDIO unlocks **multi-business + custom newsletter domain**
- STUDIO → AGENCY unlocks **white-label + 8 clients + 3 team seats**

Stripe price IDs need to be created in dashboard and pasted into
`STRIPE_PRICE_SOLO/TEAM/STUDIO/AGENCY` env vars. Until that's done, the
new prices show on the landing page but checkout won't work.

### Multi-business foundation (2026-04-28)

The full plumbing is live:

- **Schema** ([`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma)) — new
  `Business` model. Every per-business table (BrandKit, AgentContext,
  ContentDraft/Plan/Post, ConnectedAccount, Message, Call, Appointment,
  Competitor, Subscriber, Finding, Contact, PhoneNumber) has `businessId`
  with FK + index.
- **Migrations** —
  - `20260428000000_agency_plan` adds `AGENCY` enum value
  - `20260428100000_business_model` creates `businesses` table, adds
    `users.current_business_id`, bootstraps a default Business per
    existing user
  - `20260428200000_business_isolation` adds `business_id` to all
    per-business tables, idempotent (uses `pg_temp.add_fk_if_missing`
    + `IF NOT EXISTS` everywhere)
- **Context** ([`packages/api/src/context.ts`](../packages/api/src/context.ts)) —
  `ctx.currentBusinessId` resolved once-per-request batch (was once-per-procedure)
- **Routers scoped by businessId** — brand-kit, content, connections,
  messaging (inbox), business itself
- **Echo + Planner writes** — content drafts/posts/plans tagged with
  `businessId` on create
- **Meta OAuth callback** — new ConnectedAccount rows tagged with active
  business
- **Signal webhooks** — Telegram + Messenger + SMS inbound writes Message +
  Contact rows with `businessId` from the receiving channel's `ConnectedAccount`
  or `PhoneNumber`
- **UI** — sidebar dropdown ([`apps/web/components/app-shell/business-switcher.tsx`](../apps/web/components/app-shell/business-switcher.tsx))
  lists businesses, allows switching, "+ add new business" form gated by
  per-plan ceiling

**Known gap:** AgentContext is still 1-per-user (`@unique([userId])` on
the model). Brand voice is shared across all of a user's businesses. To
lift: drop the unique on userId, bootstrap a separate AgentContext per
Business in `business.create`, scope every read to `businessId`. Affects
strategist + signal + echo agents — each does an `agentContext.findUnique`
on userId today.

### Landing page

- v4 prototype port at [`apps/web/components/landing-v4/`](../apps/web/components/landing-v4/)
- Body, CSS, animation script all inlined verbatim from
  `prototype/ADFI_Landing_v4.html`
- Auto-playing hero canvas (5 moments cycling: call → DMs → content →
  scout → dashboard) at ~3.2-3.8s per moment
- Service-section phone mockups with their own scene engine
- 4-tier pricing grid (SOLO/TEAM/STUDIO/AGENCY)
- "get the app" nav button → `/download` page

**Next change requested:** consolidate the hero canvas + service
mockups into one tab-switcher section. Design proposal at the bottom
of this doc.

### Brand kit feature

Functionally complete and shipped. Generation pipeline (palette →
typography → logos → graphics → voice) using Opus 4.7 + Anthropic web
search tool, version history, restore, one-file HTML brand book download,
contrast-aware prompts.

**Updated 2026-04-28 evening:**
- New `@orb/design-agent` package wraps the pipeline. Two pure-code
  phases now run alongside the LLM-tuned logo + graphics generation:
  WCAG palette correction (`ensureWcagPalette` auto-corrects any LLM
  palette that fails AA contrast) and 5 application templates (favicon /
  social avatar / business card / email header / instagram post)
  rendered server-side and returned via `trpc.brandKit.getMine`.
- Logos render fix: `cleanSvg()` now injects `width="100%" height="100%"`
  on the root `<svg>` when missing — was making logos collapse to 0×0
  in the panel even though downloads worked.
- Caps right-sized: TRIAL **0** (paid feature), SOLO 2, TEAM 3, STUDIO 4,
  AGENCY 12 per rolling 30 days. Cost line corrected from $0.30 →
  $1.50 per regenerate. See `memory/project_pricing_tiers.md`
  "Brand-kit exception" addition.
- LLM logo + graphics prompts are still *parked* — see
  [`memory/project_brandkit_postponed.md`](~/.claude/projects/-Users-soroushosivand-Projects-adfi/memory/project_brandkit_postponed.md).
  The design-agent layer wraps them, doesn't replace them. The "LLM phases"
  of the design-agent skill (kernel, structured voice prose) are not yet
  shipped — they'd need a schema migration adding a `kernel` JSON column.

### Specialist pages redesign (2026-04-28)

The dynamic `/specialist/[id]` route was replaced with one route per
agent: `strategist`, `signal`, `echo`, `scout`, `pulse`, `ads`. Each
uses a shared `SpecialistPageLayout` (breathing signature orb + tier
pill + control row + `currently` card with rotating phrases + shimmer
progress bar) per `prototype/ADFI_Pulse_Page.html`. Per-agent sections:
BrandVoicePanel for Strategist, FindingsList for Signal/Scout/Pulse,
RecentDraftsGrid for Echo, campaigns list / empty-state for Ads. Files
under `apps/web/components/specialist/` (new) + the existing
`components/specialists/` (kept for shared bits like agent-config and
agent-controls).

### Plan resolution (fixed 2026-04-28)

Three independent bugs combined to lock STUDIO trial users out of
campaigns and freeze their credit cap. Now fixed in
[`packages/api/src/services/abuse-guard.ts`](../packages/api/src/services/abuse-guard.ts)
(`effectivePlan`),
[`packages/api/src/services/quota.ts`](../packages/api/src/services/quota.ts)
(`resolvePlanKey` + `getOrCreatePeriodRow` self-healing),
[`packages/api/src/routers/billing.ts`](../packages/api/src/routers/billing.ts)
(`getCurrent`). TRIALING + ACTIVE both count as the sub's plan; resolvers
pick highest tier among active subs; `getCurrentUsage` self-heals
`creditsLimit` upward when the resolved plan's cap exceeds the stored
cap. Detailed in CHANGELOG `Fixed (plan resolution · 2026-04-28)`.

### Echo content agent + web research

- Echo runs daily cron; produces 1 draft/user/day (intentional — see
  [`docs/ECHO_WORKFLOW.md`](ECHO_WORKFLOW.md))
- Long-form articles + news/market hints trigger a web search pass
  ([`packages/api/src/services/research.ts`](../packages/api/src/services/research.ts))
  using Anthropic's `web_search` tool — fixes "bitcoin was $42k" stale
  data class of bug
- Image generation via Replicate Flux Schnell, backfilled async after
  draft creation
- Drafts panel redesigned to be collapsed-by-default rows (56px
  thumbnail + truncated hook + "open →"); first draft auto-expands
- Hero images capped at 280px wide

### Signal "ADFI" brand leak — fixed

Agent prompt was leaking the internal "ADFI" name into customer
conversations. Critical bug. Fixed in
[`packages/api/src/agents/prompts/signal.ts`](../packages/api/src/agents/prompts/signal.ts)
+ thread-history label changed from "ADFI:" to "You:" in
[`packages/api/src/agents/signal.ts`](../packages/api/src/agents/signal.ts).
Also passes `businessName` to the prompt so the model can answer
"which platform?" with the actual business name.

### Performance

- React Query: `staleTime: 5min`, `gcTime: 30min`,
  `refetchOnMount: false` (apps/web/lib/trpc-provider.tsx)
- Once-per-request `currentBusinessId` resolution (was once-per-procedure)
- Dashboard reach query 365d → 28d (1Y toggle re-queries on client)
- `/api/health` warmer endpoint exists; cron is daily-only on Hobby
  (every-5-min requires Pro) — recommended workaround: external uptime
  monitor (UptimeRobot free tier) at the same URL

### Connect flows

- **Stripe** — checkout + portal wired, but new Stripe price IDs need
  creating in dashboard for the new pricing tiers
- **Google OAuth (Supabase)** — wired and working
- **Meta (Instagram + Facebook)** — wired but stuck. User got past OAuth
  scope errors (legacy `instagram_*` names), connected "page +
  business" successfully, returned to /settings, but Instagram still
  shows as not-connected. Most likely: the Facebook Page chosen
  doesn't have an Instagram Business account linked at the Page
  level. Diagnosis logs added in `apps/web/app/api/auth/meta/callback/route.ts`
  — next session should look at the actual Vercel logs for the
  `[meta/callback] pages from Graph:` line.
- **Telegram bot** — connect flow works; typing indicator added to
  inbound DMs

---

## 3. Decisions locked in (do not re-litigate)

- **No local Postgres** — Supabase pooler is the dev DB.
  `pnpm -F @orb/db db:migrate` (deploy) is the only path. `db:migrate:dev`
  fails on shadow DB.
- **Hobby Vercel** while developing — upgrade trigger: first paying user
  OR cold-start UX hurts launch.
- **AgentContext per-business deferred** — brand voice shared across
  businesses for now. Schema is ready (`businessId @unique` exists),
  just needs the unique-on-userId removed + bootstrap on business create.
- **Brand-kit visual quality parked** — model-generated SVG logos hit a
  structural ceiling. Don't suggest more prompt tuning. See
  `feedback_brandkit_contrast.md` + `project_brandkit_postponed.md`.
- **Carousel design system is the bar** — match its restraint for any
  new asset templates. See `feedback_carousel_design_locked.md`.
- **`businessName` not businessDescription** — the sidebar label uses
  `User.businessName` (or active `Business.name`). Never derive from
  description. See `feedback_brandkit_contrast.md` line about chip text.
- **Concise scaffold proposals** — summarize file plans, don't paste
  full source. User pays per output token.
- **No stage-by-stage confirmation** — once a multi-stage plan is
  accepted, flow through; don't gate each stage.

---

## 4. Open questions / known issues

### 4.1 Stripe price IDs not yet created

The pricing tiers landed in code (SOLO $29, TEAM $79, STUDIO $199,
AGENCY $499) but no Stripe products/prices match. Checkout will throw
`STRIPE_PRICE_<tier> env var is not set` until you:

1. Create 4 monthly recurring products in Stripe dashboard
2. Paste price IDs into Vercel env as `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`,
   `STRIPE_PRICE_STUDIO`, `STRIPE_PRICE_AGENCY`
3. Redeploy

### 4.2 Instagram connect stuck on missing IG-business-link

Most likely: chosen FB Page doesn't have IG Business linked at the Page
level. To verify, check Vercel logs for the `[meta/callback] pages from
Graph:` line — `hasIg: false` confirms. Resolution path is in Meta
Business Suite, not in our app: Settings → Accounts → Instagram → link
to the chosen Page. Then disconnect + reconnect.

### 4.3 AgentContext shared across businesses

When a STUDIO/AGENCY user creates a 2nd business, the brand voice from
their 1st business carries over. Fix scoped above. Won't bite SOLO or
TEAM users.

### 4.4 Mobile parity

`apps/mobile` exists but doesn't yet have:
- Business switcher
- Multi-business per-business inbox
- Brand kit panel
Last user-visible mobile work was the bottom tab bar. Mobile is a
follow-up area.

### 4.5 Vercel function memory + cron

On Hobby. Function memory capped at 1024MB, cron capped at daily.
Workarounds:
- Cold starts → external UptimeRobot ping every 5 min at `/api/health`
- Memory → no current need; Anthropic + Replicate calls fit in 1GB

---

## 5. Next 3 actions, in priority order

**1. Motion-reel package — `@orb/motion-reel`** (user direction confirmed
   2026-04-28 evening)
   Code-as-video for Reels / TikToks / Shorts using the landing-page
   scene templates as the reference design ceiling. Same pattern as
   `@orb/design-agent`: hand-tuned scene choreographies once, brand
   tokens + content slots vary per business. Phase-1 stack: headless
   Chromium + WebCodecs (or `MediaRecorder` fallback) on Vercel Pro
   functions. Phase-2 stack: motion-canvas if volume justifies.
   Templates to extract from `landing-script.ts` first: Signal scene
   (sms typing → reply), Echo scene (draft → preview → publish),
   Pulse rotating signals, stat card, carousel-as-reel. See
   `memory/project_motion_reel_direction.md`.
   **Decision still pending:** Vercel-first (faster ship, more
   debugging) vs. dedicated tiny render service on Fly/Railway from
   day one (cleaner, ~1 extra day setup).

**2. Content page redesign — port prototype into live route**
   Standalone HTML at `prototype/ADFI_Content_Page_Redesign.html` is
   the source of truth. Collapsed-by-default sections, amber needs-you
   card, inline slot expansion (one open at a time), why-this-plan
   reasoning hidden by default. The current `/content` route shows
   ~800 words by default and overwhelms solopreneurs; the redesign
   targets a 90-second scan with detail one click deeper.

**3. Design-agent LLM phases (deferred — needs schema migration)**
   Phases 1 (kernel) and 6 (structured voice prose) from the
   design-agent skill require adding a `kernel` JSON column to
   BrandKit + BrandKitVersion. Not urgent — the existing `voiceTone`
   JSON from Strategist + `logoConcept` string carry equivalent info.
   Pull in if/when motion-reel templates need the structured kernel
   for content selection.

---

## 6. Landing-page consolidation — design proposal

**Goal:** replace the current "hero canvas (5 cycling moments) + service
section (separate phone mockups per agent)" with **one** consolidated
section that introduces all agents/services in tabs.

**Layout sketch:**

```
┌──────────────────────────────────────────────┐
│  meet your team.                             │
│  these five agents handle your marketing     │
│  while you run the business.                 │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ ●  signal    echo    scout    pulse    │  │  ← tabs (current bold)
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │   [ canvas / phone mockup for          │  │
│  │     the active agent ]                 │  │
│  │                                        │  │
│  │   "i caught a missed call at 2am.      │  │
│  │   booked sara for tuesday."            │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ❯ next agent in 3s   ⏸ pause                │
└──────────────────────────────────────────────┘
```

**Behavior:**

- **Auto-rotation** — each tab shows for ~5s, then advances. Progress
  bar under the active tab fills as time elapses (visual cue for "next
  in 3s").
- **Manual click** — tapping any tab pauses auto-rotation, jumps to
  that tab, and shows a "▶ resume" button (replaces "⏸ pause"). After
  10s of inactivity, auto-rotation resumes.
- **Pause button** — explicit pause/play affordance. Pause persists
  until user resumes.
- **Off-screen pause** — IntersectionObserver pauses when section
  scrolls out of view (already the pattern in current canvas).
- **Reduced motion** — `prefers-reduced-motion: reduce` → no
  auto-rotation, no fades, just the first tab visible. Manual tab
  clicks still work.

**Agents to include (reuse existing copy/animations from current
landing-v4):**

1. **Signal** — answers calls + DMs ("i caught a missed call at 2am")
2. **Echo** — drafts content ("i drafted your next post")
3. **Scout** — competitive intel ("i spotted what your rivals are doing")
4. **Pulse** — news/trends ("i found a story your audience cares about")
5. **Strategist** — runs the weekly business review ("here's what
   worked this week, here's what didn't")
6. **Brand Kit** *(optional 6th tab)* — your brand identity, on tap

**Files to touch:**

- `apps/web/components/landing-v4/landing-body.ts` — strip the existing
  separate hero canvas + services sections, replace with the new
  unified section's HTML
- `apps/web/components/landing-v4/landing-script.ts` — replace the
  two existing scene engines (hero + svc-phone) with a single
  tab-controller; preserve IntersectionObserver pause logic
- `apps/web/components/landing-v4/landing-css.ts` — new tabs +
  progress-bar styles, swap out the two old section styles

**Implementation effort:** ~250-400 LOC across the three files, plus
migrating the existing per-agent HTML chunks (which are already in
`landing-body.ts` for both the hero canvas and svc sections — just
need to be merged + wrapped with the tab logic).

**Suggested copy direction:**

- Hero h1 unchanged ("Your marketing team, hired.")
- New section header eyebrow: `MEET YOUR TEAM`
- New section h2: `five agents. one inbox. zero supervision.`
- Tab labels: lowercase agent names (signal / echo / scout / pulse /
  strategist) — matches the brand voice (lowercase everywhere)
- Per-tab content: 1-line caption + one-screenshot mockup of the
  agent in action. The captions already exist in the current
  landing-body.ts — pull them into the new structure.

I can implement this in one pass once you confirm the design. Reply
"go" and I'll write the code; reply with edits if you want a different
layout or fewer/more tabs.

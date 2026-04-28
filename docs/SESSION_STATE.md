---
title: SESSION_STATE
purpose: Hand-off snapshot for the next Claude Code session
last_updated: 2026-04-28
---

# Session state — 2026-04-28

Frozen snapshot of where ADFI is, what's been built, what's locked, what's
open, and exactly what to do next. A fresh Claude Code session should be
able to pick up by reading this top-to-bottom.

For project-wide rules, read [`CLAUDE.md`](../CLAUDE.md). For architecture,
read [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). For the agent workflow,
[`docs/ECHO_WORKFLOW.md`](ECHO_WORKFLOW.md). For the multi-business
foundation specifically, see "Multi-business" section below.

---

## 1. Project status

**Phase:** pre-launch / private development. No real users. Hosting on
Vercel Hobby. The user (Soroush) is testing personally; one test user
(`maya@ceramicsco.example`) was previously seeded then deleted.

**Active branch:** `main`. Production at `https://www.adfi.ca`. Mobile app
exists in `apps/mobile` (Expo) but is not yet in the App Store / Play Store.

**Recent direction:** finishing multi-business foundation, then landing-page
consolidation, then onboarding polish. App Store / Play Store submissions
are deferred until the web product feels polished.

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
contrast-aware prompts. Visual quality of AI-generated SVG logos is
*parked* — see [`memory/project_brandkit_postponed.md`](~/.claude/projects/-Users-soroushosivand-Projects-adfi/memory/project_brandkit_postponed.md).

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

**1. Landing-page consolidation** (user-requested, in flight)
   Consolidate hero canvas + service-section phone mockups into one
   tab-switcher section. Auto-rotates every X seconds; user clicks a
   tab → freezes auto, shows that agent's content. Manual play/pause.
   Design proposal in section 6 below.

**2. AgentContext per-business**
   Drop `@@unique([userId])` on AgentContext, add bootstrap in
   `business.create` (clone the user's first AgentContext to seed the
   new Business's voice), scope every read by `businessId`. Touches
   strategist + signal + echo. ~150 LOC.

**3. Onboarding flow polish**
   Close the gap between sign-up and first specialist run so the
   product feels automatic per the "hire, don't supervise" thesis.
   Currently there's a manual run-now needed; the daily cron then
   takes over but day-1 user sees an empty dashboard.

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

---
title: SESSION_STATE
purpose: Hand-off snapshot for the next Claude Code session
last_updated: 2026-05-04
---

# Session state — 2026-05-04

Snapshot of where ADFI is right now, what's been built, what's open, and
exactly what to do next. A fresh Claude Code session should be able to
pick up by reading this top-to-bottom. Read this BEFORE
`docs/ROADMAP.md` — this is the live state; the roadmap is the plan.

---

## What's blocked / waiting

- **Meta App Review queue** (filed 2026-05-01). 8 scopes submitted.
  Awaiting decision; ETA roughly **2026-05-12 → 05-16**. Test account
  `meta-reviewer@adfi.ca` is provisioned with TEAM-tier through 2027
  via `scripts/create-meta-reviewer.ts`. Until Meta responds, no live
  user can connect IG / FB Pages — only whitelisted dev-mode accounts.

---

## What shipped since 2026-05-02

### Content page polish + bug-fix sweep (2026-05-02 → 05-04)

- **Telegram posts now publish with images** when the draft has a
  hero image (text becomes the photo caption, ≤1024 chars; longer
  text falls back to text-only). New `sendPhoto()` in
  `packages/api/src/services/telegram.ts`.
- **Mockups show real scheduled/published dates** instead of "just
  now". Platform-native formatting per channel via
  `formatPostedAt(date, platform)` in
  `apps/web/components/content/mockups/types.ts` (X uses "2h", IG
  uses "2 hours ago", Telegram uses "9:47", LinkedIn uses
  "2h"/"1w"/date, etc).
- **Telegram bot stops responding bug** — per-sender rate limit was
  5/5min, hit during normal back-and-forth. Bumped to 15/5min,
  60/1h, 200/24h in `packages/api/src/services/abuse-guard.ts`.
- **Video preview drawer opens immediately** — `tap to create video`
  now opens the ScriptPreview drawer with a "sketching script…"
  loader, then populates. Player gets `autoPlay` so the video
  plays as soon as the script lands.
- **Mobile filter modal** anchors `left-0` on small screens (was
  going off-screen left when flex-wrap moved the button to the
  left edge of the toolbar).
- **Mobile inbox** — master-detail pattern: mobile shows EITHER the
  list OR the thread (with `← all conversations` back button),
  desktop unchanged.

### Content calendar (2026-05-03)

- **Replaced WeekGrid with ContentCalendar** — month view with
  prev/next nav + "today" button, 6-row always-rendered grid, up
  to 4 thumbnail chips per day cell, `+N more` overflow badge.
- **Status rings on chips**: green=published, ink=scheduled,
  amber=review.
- **Calendar tab nav fixed** — `ContentTabsClient` now syncs from
  `?tab=` via `useSearchParams` and pushes URL updates; chip clicks
  actually switch tabs + scroll to anchor.
- **Anchor IDs** added to draft cards (`id="d-<draftId>"`) in both
  list and mockup views.
- **`approveDraft` now auto-sets `scheduledFor`** to "tomorrow at
  10am" when null — fixes empty calendar (every approved draft was
  scheduled-null before, so the calendar filtered them all out).
  Calendar also falls back to `approvedAt` for legacy approved
  drafts without `scheduledFor`.
- Out-of-month padding cells now render as quiet empty pads (no
  number, no chrome) instead of dimmed numbered cells that read as
  "scheduled" status.

### Publish-now action (2026-05-03)

- New menu item on `DraftCardV2`:
  - APPROVED status → calls `content.publishDraft` directly
  - AWAITING_REVIEW / DRAFT → chains approve → publish in one click

### Admin freeze/unfreeze (2026-05-04)

- **Per-user freeze** — admin user-detail page has freeze/unfreeze
  button. Sets/clears `User.deletedAt`. Crons (`daily-content`,
  `daily-pulse`, `weekly-scout`, `quarterly-strategist`) all
  already filter `deletedAt: null`, so freeze halts cron-driven
  token consumption. Inbound webhooks (Telegram, Messenger, IG DM,
  SMS) bail with `reason="user_frozen"` before any Anthropic call.
- **Per-business freeze** — STUDIO/AGENCY users with multiple
  Business rows can have one brand frozen while others run. Admin
  detail page shows businesses[] section with per-business freeze.
  Echo's `generateDailyContent` throws "Business is frozen" when
  the resolved currentBusiness has `deletedAt` set; webhooks gate
  on `account.business.deletedAt` / `phoneRecord.business.deletedAt`.
- New mutations: `admin.unsuspendUser`, `admin.freezeBusiness`,
  `admin.unfreezeBusiness`.

### Motion-reel — Phase 1, 1.5, 2, 3 + experimental dynamics (2026-05-02 → 03)

This is a long arc. Plan + per-phase notes in
`docs/MOTION_REEL_REDESIGN.md`. Quick state:

- **Phase 1 shipped** (2026-05-02) — pace knob now functional,
  scene transitions rotate per index, animated film grain over
  every reel.
- **Phase 1.5 shipped** — icon registry (38 SVGs), responsive
  typography (`fitText`), `data-bar` scene type.
- **Phase 2 shipped** — `editorial-bold` preset with 5 scenes
  (editorial-opener, bold-statement, icon-list, numbered-diagram,
  editorial-closer). Replaced legacy hook/stat/quote/etc. as the
  agent's preferred scene catalog.
- **Phase 3 shipped** — 4 structural-variety scenes
  (phone-mockup, metric-tile-grid, chat-thread, terminal). Two of
  them (chat-thread, terminal) were dropped from the AGENT zod
  union to fit Anthropic's grammar-size cap, but they STILL render
  and STILL validate at the router for user-edited scripts.
- **Mood + brand-signature axes** — every script picks a `mood`
  (confident/calm/energetic/urgent/contemplative/celebratory) that
  modulates pace, accent saturation, type weight, italic, and
  letter stagger. Brand signature seeds layout rotation + default
  motif by hashing the business name.
- **Editorial-bold scenes use BrandKit colors** (no longer
  hardcoded white/black) so two brands actually look different.

**Known gap on motion-reel** — even after all this, user feedback
is the videos still feel templated. Real fix requires:
1. **Photo-driven scenes** — `PhotoCutoutScene`, `HeroPhotoScene`,
   `ComparisonSplitScene`. Wire Echo's image-gen pipeline into
   editorial-bold scenes. Biggest visual upgrade pending.
2. **Audio layer** — TTS narration (per-brand voice via ElevenLabs)
   + royalty-free music loops + transition stings.
3. **Remaining 5 presets** — dashboard-tech, soft-minimal, luxury,
   studio-craft, documentary. Picker logic in
   `pickPresetForBrief` already routes industries to them; today
   every match just returns editorial-bold.

User said "We need to work on video agent later and make it more
professional" — explicitly DEPRIORITIZED. Don't touch motion-reel
unless the user asks again.

---

## Architecture quick reference

### Stack
- **Web**: Next.js 15 App Router, tRPC v11, Tailwind, Remotion `<Player>`
- **Admin**: Next.js 15 App Router (separate app on port 3001)
- **Mobile**: Expo (parked — only bottom-tab bar exists)
- **DB**: Postgres via Supabase, Prisma ORM
- **Auth**: Supabase Auth (passwordless OTP / Google OAuth + new
  password-fallback for App Review)
- **Payments**: Stripe (Payment Element, not Checkout)
- **LLM**: Anthropic SDK with `cache_control: ephemeral` on all
  long system prompts. Default model = Haiku 4.5; Strategist still
  uses Sonnet 4.6.
- **Image gen**: Replicate Flux Schnell, capped at 2 concurrent
  jobs per draft (was hitting 429 storms before the fix).
- **Video render**: Remotion Lambda. Site name `adfi-motion`. Run
  `AWS_PROFILE=adfi-remotion pnpm -F @orb/motion-reel exec
  remotion lambda sites create packages/motion-reel/src/index.ts
  --site-name=adfi-motion` after motion-reel changes.

### Hosting
- Vercel **Pro** since 2026-04-28. 2GB memory + 300s maxDuration on
  the tRPC + cron functions; sub-daily crons available but unused.

### The two names
- **ADFI** — brand. ALL user-facing strings.
- **ORB** — internal codename. ALL package names (`@orb/*`),
  variables, types, branches.
- Memory file `feedback_signal_no_adfi_leak.md` — Signal NEVER
  mentions ADFI to customers; speaks AS the business.

### Pricing (per memory `project_pricing_tiers.md`)
SOLO $29 / TEAM $79 / STUDIO $199 (2 biz) / AGENCY $499 (8 biz).
Trial = 7-day full TEAM.

---

## Known open issues (small)

- **Lambda site doesn't auto-redeploy** — every motion-reel commit
  requires the manual `sites create` command above. Could automate
  via a GitHub Action; deferred.
- **Old reels rendered with the legacy 9s template** still play
  with their original mp4. Re-render via the ⋯ menu's
  "re-render video" item to upgrade them.
- **Hash-anchor scrolling** uses 600ms retry — works but feels
  hackish. Real fix is to render panels above-the-fold synchronously
  on initial load when `?tab=feed#d-X` is present.

---

## What to do next (priority order)

Read `docs/ROADMAP.md` for the full plan. Top priorities right now:

1. **Wait for Meta App Review** — likely 1-2 weeks. While waiting,
   build the Facebook + Instagram **publish path** (Track A from
   the May-1 plan in chat history). The publish path is needed
   anyway, and once Meta approves we can immediately enable real
   IG/FB publishing.

2. **Fix prod-only bugs surfacing from real users** as they come.
   The bug-fix sweep on 2026-05-04 covered the Telegram-image,
   scheduled-date, mobile filter, mobile inbox, video preview, and
   freeze/unfreeze fronts. Anything new should land in CHANGELOG.

3. **Friendly-tester onboarding test** (T0 todo from earlier
   session) — have someone other than the founder go through
   signup → onboarding → connect a channel → first draft → first
   publish. Watch them. Document anything that breaks.

4. **Pre-launch checklist** in `docs/PRE_BETA_CHECKLIST.md` —
   3 tier-0 items left: Stripe price IDs, Meta App Review (in
   flight), Instagram-connect debugging. Read that doc before
   starting any "what should I work on" session.

**Explicitly deprioritized:**
- Motion-reel improvements (user said work on video agent later)
- Phase 2.5 / Phase 3 of motion-reel
- Mobile app (parked overall, web-first beta)
- Phase 2 of Campaign Manager (Meta/Google/TikTok ads API push)

---

## Cost-control notes (for token-conscious sessions)

The user explicitly asked for "manage token consuming" in this
hand-off. Practical rules:

1. **Memory before action.** Read `MEMORY.md` first; many decisions
   are already locked there.
2. **Ask before code.** For any redesign / rewrite, propose the
   plan in 5-10 lines; wait for approval; then execute.
3. **Don't dump source.** Per feedback memory
   `feedback_concise_proposals.md` — summarize file plans, never
   paste full source in chat.
4. **Don't stage-confirm.** Per `feedback_no_stage_confirmation.md`
   — once a multi-stage plan is accepted, flow through. Don't
   gate each stage.
5. **Don't reach for new tools.** ADFI's stack is locked
   (Anthropic / Supabase / Stripe / Vercel / Replicate / Remotion).
   Don't propose alternatives.
6. **For "still broken" loops** — don't keep trying the same fix.
   Log a hypothesis, propose ONE diagnostic, ask the user to run
   it. Move on if blocked.
7. **Auto mode is not a license to rewrite.** Bug fixes ≠
   refactors. Match scope to the request.

---

## Pointers

- `docs/ROADMAP.md` — what ships next, in priority order
- `docs/CHANGELOG.md` — what already shipped (in chronological order)
- `docs/PRE_BETA_CHECKLIST.md` — tier-0/1/2 to-dos before public launch
- `docs/PROJECT_STATUS.md` — agent-by-agent feature matrix
- `docs/MOTION_REEL_REDESIGN.md` — 3-phase video plan + Phase 4
  notes if user asks again
- `docs/CLAUDE.md` — repo-level rules (UI design system, the
  ADFI/ORB split, naming, no shadows/icons in UI, etc.)
- `~/.claude/projects/-Users-soroushosivand-Projects-adfi/memory/MEMORY.md`
  — session-persistent decisions (pricing, Vercel tier, design
  locks, voice rules, etc.)
- `~/.claude/skills/video-agent/SKILL.md` — motion-reel pipeline
  ref (parked but kept current)

---

## Previous session summary (2026-04-30 → 05-01)

Three big things shipped:

**1. Motion-reel scene-script architecture** (was single-template).
The video agent now writes a sequence of 3-7 scenes that play
back-to-back via Remotion `<Sequence>`. Switched the agent from
Sonnet to Haiku 4.5 + prompt caching. Per-video cost dropped from
~2¢ to ~1.1¢ at scale.

**2. Content page redesign.** /content rebuilt around three ideas:
GenerateBar at top, platform-authentic mockups, DraftCardV2 with a
single primary action and overflow menu.

**3. Production-lockout fix.** `prisma.business.create()` was
failing in tRPC middleware for fresh Supabase auth users — FK
constraint violated because the User row hadn't been created yet.
Fixed by upserting the User row inside the same self-heal block.

**4. Meta App Review submitted (2026-05-01).** All 8 scopes
filed. Test account provisioned. Privacy + terms updated to name
SOROOSHX INC. as data controller.

---
title: ROADMAP
purpose: What ships next, in rough priority order. Living doc.
last_updated: 2026-05-04
---

# ROADMAP

What's coming next, organized by horizon. Loosely ordered within each
section. The closer to the top of a section, the higher the confidence /
priority.

For what's *currently in flight*, read [`SESSION_STATE.md`](SESSION_STATE.md).
For what's *already shipped*, read [`CHANGELOG.md`](CHANGELOG.md).

## Now (waiting on Meta App Review · roughly 2026-05-12 → 05-16)

### 1. Build the Facebook + Instagram publish path (Track A)

The single most useful thing to ship while waiting on App Review.
Once Meta approves the additional scopes, we want to flip
auto-publish on without scrambling. Plan from 2026-05-01 chat:

1. Add `pages_manage_posts` + `instagram_content_publish` to
   `META_OAUTH_SCOPES` in `packages/api/src/services/meta.ts`.
   They'll only resolve once App Review approves but the OAuth
   dialog gates them gracefully until then.
2. New `services/meta-publish.ts` with two functions:
   - `publishToFacebookPage` — text → `POST /{page-id}/feed`,
     photo → `POST /{page-id}/photos`, video → `POST /{page-id}/videos`
   - `publishToInstagram` — 3-step container/publish flow for
     SINGLE_POST / CAROUSEL / REEL
3. Wire into `content.publishDraft` for `Platform.FACEBOOK` and
   `Platform.INSTAGRAM` next to the existing Telegram + Email
   branches.
4. Diagnostic: confirm Instagram-Business linking using the
   existing logs in `apps/web/app/api/auth/meta/callback/route.ts`
   on real connect attempts (the "[meta/callback] pages from
   Graph:" line) before re-recording App Review videos.

Keep this commit-by-commit. Test with the dev-mode whitelisted
account (founder's own IG) first.

### 2. Friendly-tester onboarding test

A non-founder signs up cold from `adfi.ca`, completes onboarding,
gets a draft. Watch them. Multi-business migration may have edge
cases that don't surface on the founder's account. ~2 hours.

### 3. Stripe production price IDs

Pure ops task. Create 4 monthly recurring products in Stripe
(SOLO $29 / TEAM $79 / STUDIO $199 / AGENCY $499) and paste the
IDs into Vercel env (`STRIPE_PRICE_SOLO` / `_TEAM` / `_STUDIO` /
`_AGENCY`). Re-deploy. Without these, the plan picker throws on
checkout. ~30 min.

### Inbox templates + knowledge base + comment triggers (planned 2026-04-29)

User-requested: "develop inbox app and add some ready replies, links and
some context for each channel and also add list of replies if user
comment specific word in a specific instagram post — must be very
minimal and simple to manage." Three features, two phases.

**Phase 1 — Ready replies + business knowledge base** *(estimated 2-3
focused hours)*

Pure CRUD + Signal prompt extension. No webhook work.

- Schema (one migration `20260429100000_inbox_templates_and_knowledge`):
  - `ReadyReply { id, businessId, channel?: ReplyChannel, label,
    body, usageCount, createdAt, updatedAt }` — channel null = available
    on every channel. enum `ReplyChannel { INSTAGRAM TELEGRAM FACEBOOK
    SMS EMAIL }`. `@@index([businessId, channel])`.
  - `BusinessKnowledge { id, businessId, type: KnowledgeType, title,
    content, createdAt, updatedAt }` — enum `KnowledgeType { LINK FACT }`.
    `@@index([businessId])`.
  - Both per-business, FK CASCADE on Business delete.
- API routers (registered in root):
  - `inbox-templates.ts`: list / create / update / delete /
    incrementUsage
  - `knowledge.ts`: list / create / update / delete
- Signal integration (`packages/api/src/agents/signal.ts`):
  - Extend the user message with two blocks before the customer
    message — "Things you can offer / explain" (BusinessKnowledge
    items) and "Approved canned replies for this channel" (ReadyReply
    rows scoped to inbound channel).
  - Add one bullet to the system prompt: "if a canned reply fits
    exactly, use it word-for-word."
  - On reply send, fire `incrementUsage` when reply text matches
    (substring) a known canned reply — drives sort-by-most-used in
    the inbox picker.
- UI (3 small touches):
  - New page `/settings/inbox-templates` — list + edit ready replies,
    grouped by channel, inline create/edit/delete. ~150 LOC.
  - New page `/settings/knowledge` — list + edit business knowledge,
    tabs for "links" vs "facts". ~150 LOC.
  - Inbox thread view (`apps/web/components/inbox/message-thread.tsx`):
    add a "/" keyboard shortcut + "use template" button surfacing
    matching ready replies + relevant knowledge for the active channel.
  - Two new entries in the existing settings nav.

**Phase 2 — Instagram comment-trigger auto-replies** *(separate session,
1-2 days incl. Meta App Review wait)*

When someone comments a specific word on a specific IG post → auto-reply
(comment back or DM). Classic ManyChat-style trigger.

- Schema: `CommentTrigger { id, businessId, instagramPostId,
  triggerWord, replyMode: 'comment' | 'dm', replyBody, isActive,
  createdAt, updatedAt }`.
- API router `triggers.ts`: list / create / update / delete /
  toggleActive.
- Webhook: extend `/api/webhooks/meta/route.ts` to handle `comments`
  field changes (currently only handles messages). Match against
  triggers; fire reply via Meta Graph API `/messages` endpoint.
- UI: new page `/settings/comment-triggers` — manage triggers per
  IG post (post picker + word + reply body + mode toggle).
- **Meta App Review** is the real blocker: needs
  `instagram_manage_messages` + `pages_manage_engagement` scopes.
  Each scope requires a use-case justification + screen recording.
  Bureaucratic risk, not technical. Not started.

**Open decisions before kickoff (to confirm with user):**
- Soft-delete (archived flag) on ReadyReply or hard delete?
- Settings sub-pages or a new top-level `/templates` route?
- Mobile parity in scope or web-only? (Mobile is parked overall.)

### Motion-reel package — `@orb/motion-reel`
- **Direction confirmed 2026-04-28 evening** — code-as-video for Reels /
  TikToks / Shorts using the landing-page scene templates as the design
  ceiling. Same pattern as `@orb/design-agent`: hand-tuned scene
  choreographies once, brand tokens + content slots vary per business.
- Economics: ~$0.05 per 30-second reel (script LLM call + compute) vs
  ~$9–$30 for raster gen via Sora/Veo. Margin per reel: 99%+.
- Phase-1 stack: headless Chromium + WebCodecs (or `MediaRecorder`
  fallback) on Vercel Pro functions. Phase-2 stack: motion-canvas if
  volume justifies.
- First template to extract: Signal scene from `landing-script.ts` —
  generalize so the SMS bubbles + reply text + stat label come from
  client content (not ADFI demo content) and the orb gradient comes
  from client palette.
- Open decision: Vercel-first (faster, more debugging) vs. dedicated
  render service on Fly/Railway from day one (cleaner, +1 day setup).
- See `memory/project_motion_reel_direction.md`.

### Content page redesign — port prototype into live route
- Source of truth: `prototype/ADFI_Content_Page_Redesign.html`
- Goal: 90-second scan view that answers "is anything wrong? do I need
  to act?" — the current page shows ~800 words by default and
  overwhelms solopreneurs.
- Key shifts: collapsed-by-default sections, amber needs-you card,
  inline slot expansion (one open at a time), why-this-plan reasoning
  hidden by default, calendar + performance below the fold.

### Stripe price IDs for new tiers
- Create 4 monthly recurring products in Stripe dashboard
- Wire price IDs into Vercel env (`STRIPE_PRICE_SOLO`/`TEAM`/`STUDIO`/`AGENCY`)
- Without these, checkout throws on the new pricing tiers

### Instagram connect debugging
- Diagnostic logs are in place; need to read Vercel logs for the
  `[meta/callback] pages from Graph:` line to confirm whether IG
  Business is linked at the FB Page level
- If `hasIg: false`, that's a Meta Business Suite config (user side, not code)

## Soon (next 2-4 weeks)

### Design-agent LLM phases (Phase 1 + Phase 6)
- Pure-code phases (Phase 2 palette + Phase 5 templates) shipped
  2026-04-28. LLM phases (Phase 1 kernel, Phase 6 structured voice
  prose) still need scaffolding.
- Requires schema migration: add `kernel` JSON column to BrandKit +
  BrandKitVersion. Not blocking — existing `voiceTone` JSON +
  `logoConcept` string carry equivalent info today.
- Pull in if/when motion-reel templates need the structured kernel for
  per-template content selection.
- Skill spec: `.claude/skills/design-agent/SKILL.md`.

### Landing-page agent consolidation (deferred)
- Merge hero canvas + service-section phone mockups into one
  tab-switcher
- Was "Now" priority but motion-reel takes precedence — those scenes
  become reel templates anyway, so consolidating them on the landing
  page first is wasted effort.

### AgentContext per-business
- Currently 1 brand voice per User; STUDIO/AGENCY users share voice
  across businesses
- Drop `@@unique([userId])` from AgentContext model
- Bootstrap a per-business AgentContext at `business.create` time
  (clone or reset)
- Scope every read by `businessId` (strategist + signal + echo)
- ~150 LOC, one migration

### Onboarding flow polish
- Close the gap between sign-up and first specialist run
- Currently: user signs up, sees an empty dashboard, has to manually
  trigger Echo / Strategist
- Goal: by the end of onboarding, user has 1+ drafts ready, brand voice
  set, and the daily cron picking up
- Aligns with the "hire, don't supervise" thesis

### Mobile parity
- `apps/mobile` has the bottom tab bar but lacks:
  - Business switcher
  - Per-business inbox / drafts view
  - Brand kit panel
- Approach: port piece-by-piece, starting with brand-voice view (already
  has a stub at `components/specialists/brand-voice-view.tsx`)

### Per-business cron iteration
- Daily-content / pulse / scout crons currently run once per User and
  only generate for `User.currentBusinessId`
- For STUDIO/AGENCY, this means 1 draft/day for the *active* business,
  zero for the rest
- Refactor `runAgentForAllEligibleUsers` → fan out per Business with
  shared credit pool accounting

## Later (1-3 months)

### Voice (Vapi) wiring + per-business phone numbers
- Twilio number is per-account today; on multi-business, each Business
  needs its own incoming line
- PhoneNumber.businessId is in the schema; provisioning UX isn't built
- Route inbound calls based on dialed number → business

### App Store + Play Store submission
- iOS: TestFlight first, App Store after we have 100+ active users
- Android: internal track via Google Play, then production
- /download page already prepared with disabled "soon" buttons; flip
  on URLs once stores accept the apps

### Vercel Pro upgrade — DONE 2026-04-28
- Triggered earlier than planned by a stuck deploy webhook on Hobby
  after a failed prerender. 2GB function memory enabled for heavy
  routes (api/trpc, api/cron/*, api/upload/logo). Sub-daily crons
  remain off (no current need). See CHANGELOG `Changed (vercel ·
  2026-04-28)`.

### App Review (Meta)
- We currently use the legacy `instagram_*` scopes; works in dev mode
  for whoever's added under App Roles
- For public launch, submit App Review for:
  `instagram_basic`, `instagram_manage_messages`, `pages_show_list`,
  `pages_read_engagement`, `business_management`
- Each scope needs use-case justification + screen-recording

### White-label for AGENCY tier
- AGENCY plan promises "your logo, your domain"
- Today: not built
- Scope: custom domain mapping, per-business email From: header,
  branded login screens at `agency.example.com/login`

### Team seats for AGENCY tier
- AGENCY plan promises 3 collaborator seats
- Today: not built
- Scope: invite by email, per-seat role (admin / editor / viewer),
  RBAC on tRPC procedures

### Echo cadence scaling
- Currently: 1 draft/user/day on cron
- For STUDIO + AGENCY: per-business 1/day → still 1-8 drafts depending on
  count (need per-business iteration above first)
- For TEAM ($79): 250 credits supports more than 1/day; UX should
  surface multiple drafts/day without feeling spammy
- Documented in [`docs/ECHO_WORKFLOW.md`](ECHO_WORKFLOW.md)

## Eventually (when justified)

### Multi-language
- Strategist already produces voice fingerprint in any language the user
  writes in; Echo follows
- Surface as a per-business setting (STUDIO+) so an agency can run
  English brands and Arabic brands side-by-side
- UI strings stay English (lowercase brand voice doesn't translate well)

### iOS Live Activities
- Show signal-handled call summary on lock screen
- Requires Apple Developer Program + native iOS work
- Won't matter until ADFI mobile has 1k+ daily users

### Inbound voice ASR + sentiment
- Vapi already does this; we'd surface it in the inbox as
  "tone: frustrated" / "tone: excited"
- Useful for triage; gates "needs you" findings on actual urgency

### Supabase RLS policies
- Today: Postgres connections come through service role from the API
  server, no RLS in place. Auth is enforced at the tRPC layer.
- For defense-in-depth, add RLS so a leaked DB connection string can't
  pull other users' data. Each per-business table gets a policy:
  `business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())`
- Adds ~200 LOC of policies + migration; deferred until launch

### Self-hosted alternative
- For users with privacy requirements (regulated industries)
- Docker Compose recipe + helm chart
- Far future; only pursue if sales demands it

## What we explicitly are *not* doing

- **Pure LLM-generated logos at production quality** — model-generated
  SVG logos hit a structural ceiling. See
  `memory/project_brandkit_postponed.md`. The design-agent layer wraps
  the LLM with WCAG-corrected palettes + deterministic templates, but
  the mark itself is still LLM output. Real long-term solution: curated
  template library or third-party logo API.
- **Self-hosted LLM** — Anthropic SLA + cost is fine; no benefit to
  running our own.
- **Generic AI chatbot product** — ADFI is for solopreneur marketing.
  Don't dilute the wedge.
- **Web3 / crypto integrations** — out of scope; SorooshX is a
  *customer's* business, not part of ADFI itself.
- **Raster video generation (Sora / Pika / Veo) for reels** — superseded
  by motion-reel (code-as-video). Raster gen costs $9–$30 per 30s clip
  vs ~$0.05 for code-as-video, with worse brand consistency. Keep
  raster as an optional STUDIO+ escape hatch only if a client need
  forces it (lifestyle / faces / real footage).
- **Customer-facing AI agent that says "I'm an AI"** — Signal speaks AS
  the business, never as a bot. See `agents/prompts/signal.ts`.

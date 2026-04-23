# ARCHITECTURE.md

The technical decisions that shape this project. Every choice here has a reason attached. If you want to override one, read the rationale first — it usually captures a non-obvious tradeoff.

## Product thesis (most important section)

ORB is designed around one claim: **solopreneurs want to hire their marketing, not supervise it.**

Everything technical flows from this. If we get the tech right but break this thesis in UX, we've failed. If we compromise the tech for the sake of this thesis, we've won.

Three implications worth calling out:

1. **Autonomous by default.** The backend must be able to take actions (post, reply, book) without waiting for user confirmation. Confirmation flows are the exception, not the rule.

2. **Six invisible agents, one visible brand.** Under the hood, six specialized agents (Strategist, Scout, Pulse, Ads, Echo, Signal) coordinate. To the user, it's always "ORB" — one colleague. The backend is multi-agent; the UX never exposes this.

3. **The user trusts by default, or they leave.** Unlike most AI tools where the user reviews every output, ORB must earn trust fast and then get out of the way. This means a 7-day shadow period at the start (ORB drafts, user approves via text), then autopilot forever.

## Stack decisions

### Monorepo — pnpm workspaces + Turborepo

**Why:** We have three apps sharing types, auth, and database. Duplication across three repos would rot within a month. Turborepo gives us parallel builds and smart caching; pnpm gives us disk-efficient installs and strict dependency boundaries.

**Why not Nx:** More powerful but more opinionated. We want incremental adoption, not a framework.

**Why not Yarn 4 Berry:** pnpm's strict peer dependency enforcement catches more bugs, and its workspace protocol is simpler.

### Mobile — Expo (managed workflow)

**Why:** We get OTA updates, EAS builds, push notifications, and the whole native module ecosystem without ever opening Xcode. For a v1 that ships fast, managed workflow is right.

**What we give up:** Some native modules aren't available in managed workflow. If we hit that wall (unlikely for v1), we use `expo prebuild` to eject to bare. We don't eject preemptively.

**SDK version:** Pin to the latest stable SDK (54+ at time of writing). Upgrade quarterly, not continuously.

### Web + Admin — Next.js 15 (App Router)

**Why:** Server components let us keep secrets on the server without a separate API layer for simple stuff. App Router's file-based routing scales better than Pages Router for our admin's nested structure.

**Why not Remix:** Similar quality, smaller ecosystem, more context-switching if you later need Next-specific features.

**Why not separate backend (Fastify/Hono):** For v1, Next.js API routes + tRPC cover everything. We can extract a dedicated backend later if we need to scale the API independently. YAGNI until proven.

### API layer — tRPC v11

**Why:** End-to-end type safety between mobile, web, admin, and server. When I change a router signature, TypeScript errors appear in every consumer. No OpenAPI specs to maintain, no code generation steps, no drift.

**Why not REST:** Maintainable at scale only if you're disciplined about OpenAPI and code generation. We'd rather spend that discipline budget elsewhere.

**Why not GraphQL:** Overkill for a single-team product. The benefits (multiple clients with different needs) aren't real for us yet.

**What we're committing to:** tRPC only works well with TypeScript clients. If we ever need a third-party integration, we'll add a thin REST wrapper around specific routes. That's fine.

### Database — Postgres via Supabase

**Why Postgres:** Relational schema, JSONB when we need flexibility, `pg_cron` for scheduled jobs, mature everything.

**Why Supabase over raw Postgres (Neon, RDS):** Auth + storage + realtime in one managed service. Row Level Security policies are enforceable at the DB layer — a real security win. Free tier is generous enough for early users.

**When to migrate off:** When we hit one of (a) >100k users, (b) specialized auth needs Supabase can't meet, (c) need for sharding. Probably 12-18 months out. By then, revenue justifies the migration cost.

**ORM — Prisma:** Best DX in the TypeScript ecosystem. Schema-first, typed everywhere, migration tooling is good. Drizzle is competitive but Prisma's ecosystem is bigger.

### Auth — Supabase Auth

**Why:** Phone OTP and email magic links out of the box. Works for both mobile and web. RLS integrates natively. Free.

**Why not Clerk:** Polished but $25/mo after free tier. And it doesn't play as nicely with RLS.

**Why not custom (Lucia, Better-Auth):** More control, more work. We don't need control we can't get from Supabase yet.

**Auth flow for ORB specifically:**
- **Mobile:** Phone OTP primary. Email as backup. No passwords.
- **Web marketing site:** Email magic link (users come from ads, less friction than phone).
- **Admin:** Email + TOTP 2FA enforced. No OAuth.

### Storage — Supabase Storage

**Why:** Same reason as DB — it's part of the stack. S3-compatible API if we ever migrate. RLS-backed access policies.

**What goes where:**
- `user-photos/<user_id>/...` — photos users upload for posts
- `audio-clones/<user_id>/...` — voice samples for Signal's voice cloning
- `generated-content/<user_id>/...` — AI-generated images (when used)

### Payments — Stripe (Billing + Payment Element)

**Why Stripe:** Best-in-class. Every integration exists. Regulatory stuff handled.

**Why Payment Element (not Checkout):** We want card entry embedded in our onboarding, not a redirect. Payment Element gives us that with PCI compliance built in.

**Billing model:** Subscription with 7-day trial, card required upfront (industry standard, doubles conversion vs. card-free trial). Trial end triggers the first charge automatically. Proration on plan changes is handled by Stripe.

**Webhook endpoint:** `/api/webhooks/stripe` in `apps/web`. Signature verification is non-negotiable. Webhook events update our `subscriptions` and `billing_events` tables.

### Phone + SMS — Twilio

**Why:** Most mature platform. Programmable numbers, SMS delivery in every country we care about, global phone number inventory.

**What Twilio handles:**
- Provisioning a phone number per user during onboarding
- Inbound SMS webhook (customer texts our number → Signal agent replies)
- Outbound SMS from our agents
- Call forwarding to Vapi for voice AI

**Number lifecycle:**
- User signs up → Twilio API provisions a number → stored in `users.orb_phone_number`
- User cancels → 30-day grace period → number released back to Twilio pool

### Voice AI — Vapi

**Why:** Wraps OpenAI Realtime API with a conversational layer designed for phone calls. Handles audio streaming, interruption, end-of-turn detection.

**Why not Retell or direct OpenAI:** Retell is comparable; we picked Vapi for easier Twilio integration. Direct OpenAI Realtime requires too much infrastructure for a small team.

**What Signal does via Vapi:**
- Answer incoming calls on the user's ORB number
- Use custom system prompt per-user (loaded from their `agent_context` table)
- Extract structured intent (custom commission inquiry, appointment request, complaint)
- Handoff to our tRPC `signal.handleCallResult` to record the interaction

### LLM — Anthropic Claude

**Why:** Best quality for the task (nuanced content creation, voice matching, agentic reasoning). Longer context window helps when we load a user's past posts + brand voice + competitor data into a single prompt.

**Model selection:**
- **Claude Opus 4.7** (via `claude-opus-4-7`) — default for all content creation, strategy, and high-stakes tasks
- **Claude Sonnet 4.6** (via `claude-sonnet-4-6`) — faster/cheaper for simple classifications (intent detection, content filtering)
- **Claude Haiku 4.5** (via `claude-haiku-4-5-20251001`) — ultra-fast for real-time needs (e.g., live conversation turn classification)

**Orchestration pattern:** Each agent runs as a separate Claude conversation with its own system prompt. Agents communicate via shared database tables, not by directly invoking each other. Keeps things debuggable.

**What we're not using:** LangGraph, CrewAI, AutoGen. We'll add orchestration libraries when the coordination logic outgrows plain TypeScript. For v1, simple is better.

**SDK:** `@anthropic-ai/sdk` directly. No wrappers.

### Social APIs — Meta Graph API

**v1 scope:** Instagram Business only. Facebook Pages comes in v1.5.

**What we need:**
- OAuth flow to let users connect their Instagram Business account
- Publishing content (posts, carousels, reels)
- Reading DMs (messaging inbox)
- Reading insights (reach, engagement)

**App review required:** Meta requires app review for the permissions we need (`instagram_manage_messages`, `instagram_content_publish`). Review takes 6-8 weeks. Start early.

### Infra

- **Web + Admin:** Vercel. Edge functions for tRPC routes by default, Node runtime for anything touching Stripe/Twilio (their SDKs need Node).
- **Mobile:** EAS (Expo Application Services). EAS Build for App Store binaries. EAS Update for OTA updates.
- **Background jobs:** Supabase Edge Functions for scheduled work (cron via `pg_cron`). If we outgrow this, add a dedicated worker on Railway.
- **Error tracking:** Sentry. Mobile + web + admin all report to the same project.
- **Analytics:** PostHog. Event tracking for product analytics.
- **Logging:** Better Stack (Logtail) for structured logs. Stripe/Twilio/Vapi webhooks all log structured events.

## Agent architecture

Six agents, each a separate system prompt + tool set + memory context.

### Strategist
Owns: brand voice fingerprint, ICP definition, content strategy guidelines.
When it runs: once on signup (analyze the user's business), then monthly refreshes.

### Scout
Owns: competitor tracking, rival content monitoring.
When it runs: weekly sweeps. On-demand when user asks "what are my competitors doing?"

### Pulse
Owns: external signals — news, trends, cultural moments relevant to the user's business.
When it runs: daily sweeps. Surfaces "act fast" opportunities.

### Ads
Owns: paid campaign planning, budget allocation, creative generation.
When it runs: weekly planning, daily optimization. **Out of scope for v1 MVP.** Stub it.

### Echo
Owns: organic content creation — posts, captions, hashtags, scheduling. The user-facing hero agent for content.
When it runs: daily content pipeline. On-demand for user-triggered posts.

### Signal
Owns: calls, SMS, DMs, email, appointments. The user-facing hero agent for inbound comms.
When it runs: real-time on every inbound call/message. Booking logic runs sync.

**Coordination:** Agents share state via the `agent_context` table (per-user context) and `agent_events` table (cross-agent signals). When Strategist updates the brand voice, Echo reads the latest version on next run. No direct agent-to-agent calls.

**System prompts:** Stored in `packages/api/src/agents/prompts/*.md`. Versioned. Loaded at runtime with user context interpolated.

## Data flow — the critical paths

### Onboarding (6 steps)
```
Mobile app → tRPC → onboarding.step1 → DB write
Mobile app → tRPC → onboarding.step2 → DB write
Mobile app → tRPC → onboarding.runAnalysis → Claude Opus (analysis) → DB write → return to client
Mobile app → Stripe Payment Element → client-side card save → tRPC → onboarding.finalizeCard
Mobile app → tRPC → onboarding.provisionPhone → Twilio API → DB write
Mobile app → Meta OAuth redirect → tRPC → onboarding.finalizeIg → DB write → enqueue Strategist
```

The Strategist job runs after onboarding completes, analyzing the user's Instagram and website in the background. Results populate `users.brand_voice` within 30-60 seconds.

### Incoming call (Signal hero flow)
```
Customer dials ORB number → Twilio receives → forwards audio to Vapi
Vapi → runs per-user system prompt (loaded from agent_context)
Vapi → real-time conversation with caller
Vapi → end of call → webhook to /api/webhooks/vapi
Webhook → tRPC internal → signal.handleCallResult → DB write + push notification to user
```

### Daily content pipeline (Echo)
```
pg_cron (3am daily) → Supabase Edge Function
Edge Function → reads user list → enqueues one Echo job per user
Echo job → Claude Opus (content generation) → DB write as draft
If user is in shadow mode → SMS preview to user
If user is past shadow mode → schedule to publish via Meta Graph API
```

## Security model

- **Supabase RLS is the primary access control.** Every table has policies. Never bypass RLS in application code.
- **Service role key lives only in backend envs.** Never expose to client.
- **Stripe webhook signatures verified.** Every webhook route calls `stripe.webhooks.constructEvent`.
- **Meta Graph API tokens encrypted at rest.** AES-256 via Supabase Vault or explicit app-level encryption.
- **Voice recordings opt-in.** Voice cloning requires explicit consent recorded in DB.

Full threat model in `SECURITY.md`.

## Non-goals (things we're explicitly not doing)

- Multi-tenant enterprise features (SSO, SAML, workspaces)
- Desktop app
- Android support in v1 (iOS-first; Android after PMF)
- Real-time collaboration (not a team product)
- LLM-provider abstraction (Claude-only until proven otherwise)
- Self-hosted option

## When to revisit this doc

- Before onboarding a new engineer
- When adding a new top-level dependency
- When a migration (DB, platform) is proposed
- Quarterly review regardless

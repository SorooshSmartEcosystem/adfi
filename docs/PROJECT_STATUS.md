---
title: PROJECT_STATUS
purpose: Full state of ADFI as of 2026-04-29 — source material for YC application + pitch deck. Drafted to be readable by another LLM (e.g. Claude on the web) and excerpted into the YC form's text fields and a 10-slide deck.
last_updated: 2026-04-29
---

# ADFI — current status (2026-04-29)

> **One-liner.** ADFI is an autonomous marketing team for solopreneurs. Six specialist agents run a small business's content, customer messaging, paid ads, market research, and weekly strategy — without supervision. The user *hires* ADFI, doesn't supervise it.

> **30-second pitch.** Solopreneurs spend 15–25 hrs/week on marketing they don't enjoy and aren't good at. SaaS tools sell *more dashboards*. Agencies are $3–$8k/month. ADFI replaces both — six AI agents (one per function: voice, content, social inbox, competitive intel, market signals, paid ads) that run the work end-to-end and surface only what truly needs the owner's eyes. $29–$499/mo. Pre-launch, technically ready, looking for YC to accelerate go-to-market.

---

## 1. The product, exactly

### The thesis (load-bearing)

The founder *hires* ADFI rather than supervises it. Three concrete consequences shape every product decision:

1. **Autonomous by default** — agents act first, ask second. The dashboard looks empty when things are working ("everything is running") because work is happening, not waiting on the founder.
2. **Status over action** — the UI surfaces 1 thing at a time when something genuinely needs the owner's eyes. Detail is opt-in.
3. **Voice is colleague, not SaaS** — "i posted 3 things this week" beats "3 posts published". "i caught a missed call at 2am, booked sara for tuesday" beats "1 new appointment".

### The six specialist agents

| Agent | What it actually does | Plan tier | Status |
|---|---|---|---|
| **Strategist** | Reads the business description, runs Claude Opus 4.7 with web search to research the category, produces the brand voice fingerprint (tone, values, audiences, content pillars, do/don't list). Refreshes quarterly using the last 90 days of performance data. | Starter (all plans) | ✅ Production. Multilingual: detects Farsi/Arabic/CJK/Cyrillic input, writes voice in same language. |
| **Signal** | Answers calls, SMS, Instagram DMs, Telegram DMs in the business's voice. Books appointments to a real calendar. Detects customer language and replies in it (a Farsi customer DMing an English brand gets a Farsi reply). Never mentions "ADFI" or "AI" — speaks AS the business. | Starter | ✅ Production. Inbound webhooks: Twilio (calls + SMS), Meta Graph (Instagram DM), Telegram bot. |
| **Echo** | Drafts content end-to-end: caption, hashtags, hero photo (Replicate Flux Schnell), carousel slides, email newsletters with HTML templates, reel scripts beat-by-beat with per-beat images, story sequences. Triggers Anthropic web search on news/market topics for fact-grounded posts. Adapts voice + format diversity from the last 90 days of performance. Multilingual via the same prompt-level LANGUAGE LOCK as Strategist. | Team | ✅ Production. Drafts route through review → approve → publish pipeline (Meta + Telegram + email via SendGrid + manual-mark for Twitter). |
| **Scout** | Weekly competitor sweep. Tracks 3–5 rival accounts the user names. Surfaces price changes, new offers, posts that took off. | Team | ✅ Production. Cron-driven (`0 8 * * 1`). |
| **Pulse** | Daily news + trend pulse. Pulls from Google News RSS, surfaces signals relevant to the user's industry + audience. "Mother's day in 14 days · gift bundles outsell singles 3:1." | Team | ✅ Production. Cron-driven (`0 9 * * *`). |
| **Campaign Manager (Ads)** | Plan + launch + manage paid campaigns across Meta (Facebook + Instagram), Google Ads, TikTok Ads. Single brief → multi-platform creative. Auto-rebalances spend toward what's working, kills underperformers. | Studio | 🟡 Phase 1 shipped: agent + UI + plan-gating. Phase 2 (Meta Marketing API push) is the next launch-blocking piece. |

Plus a **Design Agent** spec exists at [`.claude/skills/design-agent/SKILL.md`](../.claude/skills/design-agent/SKILL.md) — produces brand kits, palettes, logos, application-mockup templates per business. Phase 2 (palette + templates) is shipped as `@orb/design-agent`. LLM phases (kernel, voice prose, logo, graphics) are wrapped around the existing brand-kit pipeline.

### Multi-business architecture

| Tier | Businesses | Voice | Inbox | Dashboard | Drafts |
|---|---|---|---|---|---|
| SOLO ($29) | 1 | per-business | per-business | per-business | per-business |
| TEAM ($79) | 1 | per-business | per-business | per-business | per-business |
| **STUDIO ($199)** | **2** | per-business (each has its own brand voice) | per-business | per-business | per-business |
| **AGENCY ($499)** | **8** | per-business | per-business | per-business | per-business |

Each business is a fully isolated workspace. STUDIO/AGENCY users switch businesses via the sidebar; every cached query invalidates and the entire dashboard / drafts / brand kit / inbox re-renders for the new business. Different brand voice per business. Per-conversation language matching for inbound DMs (a single business serving English + Farsi customers replies to each in their own language).

### Internationalization

- **Strategist + Echo** — script-based language detection (Arabic / Farsi / Hebrew / CJK / Cyrillic / Thai / Devanagari), explicit LANGUAGE LOCK directive in the prompt that names the detected language and lists every output field that must match.
- **Signal** — detects per-conversation language from `inboundMessage + threadHistory`. Brand voice's language doesn't override customer's language.
- **UI** — `unicode-bidi: plaintext` on every text element + Farsi font fallback stack (Vazirmatn → Tahoma → Geeza Pro → Noto Sans Arabic). Farsi/Arabic content lays out RTL automatically per element; mixed Farsi+English strings handled by browser bidi algorithm.

### Pricing & unit economics

| Tier | Price/mo | Credits | Voice calls/mo | Businesses | COGS at typical use | Margin |
|---|---|---|---|---|---|---|
| TRIAL (7 days) | $0 | 50 | 5 | 1 | — | acquisition cost |
| SOLO | $29 | 60 | 0 (DM-only) | 1 | ~$3 | 90% |
| TEAM ★ | $79 | 250 | 100 | 1 | ~$8 | 90% |
| STUDIO | $199 | 600 shared | 250 | 2 | ~$15 | 92% |
| AGENCY | $499 | 2000 shared | 600 | 8 | ~$40 | 92% |

**Capability gates over credit caps** (the user explicitly chose this structure):
- SOLO → TEAM unlocks **voice calls + web research + priority queue**
- TEAM → STUDIO unlocks **multi-business + custom newsletter domain + advanced analytics**
- STUDIO → AGENCY unlocks **white-label + 8 client businesses + 3 team seats**

The 7-day trial gets full TEAM features (so users see the killer features — voice + research — before deciding). Card on file required, auto-converts to TEAM ($79) at end of trial.

Hard caps that protect margin:
- **Brand-kit regenerations**: 0 / 2 / 3 / 4 / 12 per rolling 30 days. Trial is paid-feature-gated. ~$1.50 in Anthropic spend per regen at typical (Opus 4.7 + adaptive thinking).
- **Voice/SMS minutes**: separate plan-tied caps (Vapi + Twilio per-minute is non-trivial).

---

## 2. Tech stack & infra

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web + Admin | Next.js 15 App Router |
| Mobile | Expo (managed workflow, iOS + Android one codebase) |
| API | tRPC v11 — end-to-end type safety |
| Database | Postgres via Supabase (pooler for prod) |
| Auth | Supabase Auth (Google OAuth + magic link + phone OTP) |
| Payments | Stripe (Checkout + Customer Portal + webhooks) |
| LLM | Anthropic Claude — Opus 4.7 default, Sonnet 4.6 for lighter tasks, Haiku 4.5 for real-time |
| Image gen | Replicate (Flux Schnell, Flux 1.1 Pro) |
| Voice AI | Vapi |
| Phone + SMS | Twilio |
| Social | Meta Graph API (Instagram + Facebook), Telegram Bot API |
| Email | SendGrid via Supabase Auth |
| Hosting | **Vercel Pro** (web + admin + cron) |
| ORM | Prisma 5.22 |

**Architecture decisions locked in** (do not re-litigate):
- Mobile = Expo (never eject without permission)
- Web = App Router, NOT Pages
- API = tRPC only (no REST except webhooks)
- DB = Supabase pooler is the dev DB; no local Postgres
- LLM = Anthropic only (no fallback to OpenAI / others)

**Repo size signal**: 220+ commits on `main`. ~25,000 lines of TypeScript. 23 Prisma migrations applied.

---

## 3. What's production-ready

### User-facing surfaces

- **Marketing site** ([`apps/web/components/landing-v4`](../apps/web/components/landing-v4)) — hero with breathing orb + meet-the-team scenes (6 agents, each with its own animated phone-mockup demo), 4-tier pricing grid, FAQ, signup. Used by Claude as the visual reference for the motion-reel package.
- **Onboarding flow** — 7 steps: business description → goal → analysis (live Strategist run, ~30s) → wow moment (preview of what ADFI will produce) → plan picker → phone connect → Instagram connect. Multilingual.
- **Dashboard** — "everything is running" pulse + 4 KPIs (revenue impact, reach, conversations, time saved) + reach-over-time chart with 1W/4W/3M/1Y toggle + 14-day engagement bars + channel grid (Instagram/LinkedIn/Facebook/Telegram bot/Telegram channel/calls+sms/email) + "what's working" lift report + recent-activity timeline.
- **Content** — this-week plan with 5 slots, drafts list with inline editor + image preview + approve/reject/regen, performance tab.
- **Brand kit** — 6-role palette + typography pairing + 5 SVG logo variants + 3 cover graphics + voice tone + image-style prefix. WCAG-validated palettes (auto-corrects any LLM output that fails AA contrast). 5 application templates (favicon, social avatar, business card, email header, Instagram post). One-file HTML brand book download. Per-version history with restore.
- **Inbox** — unified message + call thread view, signal-handled vs needs-human triage, per-channel filtering.
- **Specialist pages** (one per agent) — breathing signature orb + tier pill + control row (run-now / pause) + currently-card with rotating phrases + per-agent section (brand voice for Strategist, findings for Signal/Scout/Pulse, recent drafts for Echo, campaigns list for Ads).
- **Settings** — business profile (name, logo, description, website), connect-channels with step-by-step guides (Instagram, Facebook, Telegram bot + channel, phone), billing (Stripe portal embed).
- **Campaigns** — list, create-from-brief flow, plan + ads + metrics views, plan-gated to STUDIO+.

### Backend services (cron-driven, autonomous)

- **Daily content** (`0 10 * * *`) — Echo drafts the next post for every active user.
- **Daily pulse** (`0 9 * * *`) — Pulse pulls trends + news, surfaces signals.
- **Weekly scout** (`0 8 * * 1`) — Scout sweeps competitor activity.
- **Quarterly strategist** (`0 7 * * 1`, runs only when 90+ days have passed) — Strategist refreshes voice using performance data.
- **Health warmer** (`*/5 * * * *`) — keeps the function pool warm, eliminates cold-start tax.

### Infra hardening shipped

- **Multi-business per-business isolation** — every per-business table (BrandKit, AgentContext, ContentDraft/Plan/Post, ConnectedAccount, Message, Call, Appointment, Competitor, Subscriber, Finding, Contact, PhoneNumber, Campaign) carries `businessId` FK. Routers + agents scope reads/writes by `ctx.currentBusinessId`. Switching businesses busts the entire Next.js Router Cache via `revalidatePath("/", "layout")`.
- **Auth optimization** — middleware passes the validated user via header to page handlers; pages no longer do a second Supabase `getUser()` call. Saves 150–300ms per navigation.
- **Performance** — React Query 5min staleTime, gcTime 30min, refetchOnMount: false. Once-per-request `currentBusinessId` resolution. Loading skeletons on every dash route.
- **Security** — Stripe webhook signature verification, no secrets in client bundle, admin endpoints behind `ADMIN_EMAILS` allow-list. `.env.local` not committed.

---

## 4. What's still in flight / parked

Honest list. None are launch-blockers but some are next priorities.

| Item | Status | Why |
|---|---|---|
| **Mobile app (iOS + Android)** | Scaffolded, not feature-complete | Expo project exists with bottom tab bar, but no business switcher, no per-business inbox/drafts, no brand kit. Web product takes priority pre-launch. |
| **Phase 2 of Campaign Manager** (actually push to Meta/Google/TikTok) | Phase 1 (drafts + UI) shipped; Phase 2 (live API push) deferred | Needs OAuth flows + ad spend approval + budget gates. Meaningful work; maybe 1 month. |
| **Motion-reel package** (`@orb/motion-reel`) | Phase 1 shipped (Remotion-based scene compositions) | Local rendering works end-to-end. Vercel-side rendering needs `@sparticuz/chromium` integration that's still flaky. Disabled in production via env flag. Phase 2.5 = ~1-2 hour focused session. |
| **Dashboard Suspense streaming** | Documented in `SPEED_AUDIT.md` | Biggest remaining perceived-speed win. Refactor splits the page into independently-streamed sections instead of waiting for slowest of 5 queries. ~1-2h focused work. |
| **Echo multilingual flexibility per-post** | Auto-detected per-business today | A single business that posts both English and Farsi content (different platforms / different audiences) needs a per-slot language picker. Detection helper exists; UI + plan-item language slot are the work. |
| **AGENCY white-label** | Promised in tier, not built | Custom domain mapping, per-business email From: header, branded login screens. Real work, ~2 weeks. |
| **AGENCY team seats (3 seats)** | Promised in tier, not built | Invite by email + per-seat role + RBAC on tRPC procedures. ~1 week. |
| **App Store + Play Store submission** | Deferred until web product polish complete | TestFlight first, then App Store. /download page already wired with disabled "soon" buttons. |
| **Meta App Review** | Using legacy `instagram_*` scopes (works in dev mode for added users) | For public launch, need to submit App Review for `instagram_basic` + `instagram_manage_messages` + `pages_show_list` + `pages_read_engagement` + `business_management`. Each scope needs use-case justification + screen recording. |
| **Per-business cron iteration** | Crons run once per user, not once per business | STUDIO/AGENCY users get content for the active business only on a given day. Not user-blocking — cron writes to the active business's table; user can switch + manually run-now. |
| **Supabase RLS** | Not enabled (auth at tRPC layer only) | For defense-in-depth pre-public launch. ~200 lines of policies. |

---

## 5. Current launch stage

**Phase: pre-launch private beta. Zero paying users.** The founder (Soroush) is the sole tester. Active in production at `https://www.adfi.ca`.

**What's deployed and working:**
- Full web app live on Vercel Pro
- Sign-up / sign-in flow (Google OAuth + email / magic link)
- 7-step onboarding
- All 6 specialist pages
- Brand kit generation (Sonnet for spec + Opus 4.7 for logos/graphics)
- Multi-business switching
- Content drafting + image generation + image-reroll
- Plan picker with Stripe Checkout (test mode; production Stripe price IDs need creation)
- Daily/weekly cron schedule running

**Immediate launch blockers (work needed to onboard a 10-paid-user pilot):**
1. Stripe price IDs for the 4 plan tiers (manual step in Stripe dashboard — minutes of work)
2. Meta App Review submission (~1 week of paperwork + screen recordings)
3. Quick UX pass on speed (Suspense streaming on dashboard, ~1-2h)

**Soft launch path (the founder's plan):**
1. Month 1 — close 10 friendly solopreneurs at SOLO/TEAM tier ($290–$790 MRR). Manually onboard each.
2. Month 2 — soak the system. Iterate on Echo/Signal quality based on real user content. Fix what 10 users surface.
3. Month 3 — open paid acquisition (founder will ad-spend on his own platform's ads to drive trial signups). Goal: 100 paid users by month 4.

---

## 6. Why now / what's defensible

**Why now:**
- LLM quality crossed the threshold where a single agent can write content that *passes* for a small business owner's voice. Sonnet 3 wasn't there. Opus 4.7 + adaptive thinking is.
- Solopreneur SaaS spend hit $5–8B with ~30% YoY growth. Most of that is point tools (Buffer, Notion, Calendly). The aggregator-replacement-all-at-once play is open.
- Voice AI (Vapi) crossed the conversational latency threshold where AI on phone is no longer offensive. 12 months ago this product wouldn't have worked for calls.

**What's defensible:**
- **Six-agent system, not one chatbot.** Building one good agent is months. Building six that share state, defer to each other, and surface only what truly needs the owner's eyes is years if a copycat starts now.
- **Per-business brand voice** that propagates across content + DMs + calls. Solo SaaS tools each have their own "tone of voice" setting; ADFI has a single fingerprint shared across every agent.
- **Multilingual at the agent layer.** Strategist / Echo / Signal each detect language and respond in it. Most marketing SaaS is English-only.
- **The "hire don't supervise" UX** — empty dashboard when things work, single needs-you slot when they don't. Most SaaS does the opposite (dashboards full of widgets demanding attention).

**What we're NOT defensible on:**
- The underlying LLM (Anthropic). Same model anyone can use.
- The UI primitives (Tailwind, Next.js). Standard.
- The integrations (Twilio, Meta Graph, Stripe). Common.

The defensibility is the integration of all of it into a coherent agent system.

---

## 7. Founder & team

- **Soroush Osivand** — solo technical founder. Designed and built the full system. Reachable as `soroushosivand@gmail.com`.
- **No co-founder yet.**
- **No external funding to date.**

---

## 8. The YC ask (use this for the application's "what would you do with the money" question)

YC funding would unlock:

1. **A second technical hire** — focus on mobile (Expo) + the AGENCY-tier white-label work. Founder stays on web + agent quality.
2. **Real user-research budget** — the founder is one solopreneur; the product needs to work for 100 different small-business archetypes. Paying solopreneurs to onboard + tell us where Echo writes wrong is the fastest path to product-market fit.
3. **Paid acquisition runway** — ~$10k/mo of ad spend tested across IG, LinkedIn, X, podcast sponsorships to identify which channel converts solopreneurs cheapest.
4. **Meta + TikTok partner program submissions** — prerequisite for the full Campaign Manager Phase 2.

**12-month plan with YC funding:** 1000 paid users at $79 average = $79k MRR. Roughly $950k ARR run-rate. ~92% gross margin. Path to default-alive at ~$120k MRR.

---

## 9. Pitch deck structure (suggested, 10 slides)

For Claude on the web to expand each into a slide:

1. **Title** — ADFI · Your marketing team, hired.
2. **Problem** — Solopreneurs lose 15–25 hrs/week to marketing they can't do well. Existing tools sell more dashboards. Agencies sell $3–8k/mo retainers.
3. **Solution** — Six AI agents that *do* marketing autonomously. Voice, content, social inbox, competitor watch, market signals, paid ads.
4. **Demo** — short loom: cold landing → DM arrives → Signal answers + books appointment → Echo posts → dashboard shows 1 thing needs you.
5. **Why now** — Opus 4.7 quality threshold. Vapi conversation latency. $5–8B solopreneur SaaS market growing 30% YoY.
6. **Product** — the six agents diagrammed (one per row, with example output for each).
7. **Pricing & unit economics** — 4-tier table with margin column. 90–92% gross margin.
8. **Defensibility** — six agents shared-state ≠ chatbot. Per-business voice that propagates everywhere. Multilingual. Hire-don't-supervise UX.
9. **Status** — live, 220 commits, sole-tester pre-launch. Soft launch path: 10 → 100 → 1000 paid users in 4 months.
10. **Ask** — $X for technical hire + user research + paid acquisition + partner program submissions.

---

## 10. Quick-reference numbers for the YC form

| Field | Answer |
|---|---|
| Stage | Pre-launch beta |
| Users (paid) | 0 |
| Users (active testers) | 1 (founder) |
| MRR | $0 |
| Time to launch (paid pilot of 10 users) | 2–4 weeks |
| Time to PMF target (100 paid) | 4 months |
| Gross margin (modeled at typical use) | 90–92% |
| Engineering team size | 1 |
| Funding raised | $0 |
| Lines of TypeScript | ~25,000 |
| Database migrations | 23 |
| Commits on main | 220+ |
| Production hosting | Vercel Pro + Supabase |
| Languages supported | English, Farsi, Arabic, Hebrew, Chinese, Japanese, Korean, Russian, Thai, Hindi (10) |

---

## How to use this doc with Claude on the web

Paste the entire file. Tell it:

> "I'm applying to YC. Here's the full state of my project (above). Generate (a) a YC application using the standard YC W26 application questions — keep each answer punchy and in the founder's voice, no marketing fluff, and (b) a 10-slide pitch deck outline with one-paragraph speaker notes per slide. Use only the facts in this document — don't invent metrics."

You can also use it as the source for:
- Investor email cold outreach
- Crunchbase listing
- Product Hunt launch description
- The "about ADFI" section of the marketing site

---
title: Campaign Manager — Design Doc
status: design (not yet implemented)
agent_enum: ADS
plan_tier_min: STUDIO ($199)
last_updated: 2026-04-28
---

# Campaign Manager — design

The 7th agent. Plans, runs, and optimizes paid ad campaigns across Meta
(Instagram + Facebook) at v1; Google Ads + LinkedIn Ads at v2. Lives in
the `Agent.ADS` enum slot (already in the Prisma schema and exposed as
"coming soon" in
[`apps/web/components/specialists/agent-config.ts`](../apps/web/components/specialists/agent-config.ts)).

This doc proposes the full shape so the user can sanity-check before we
write code. Estimated implementation: ~1500 LOC for v1 (one-channel,
Meta only), ~1 week.

## What it does

In one sentence: **owners say "promote this," Campaign Manager runs the
ads, watches performance, and pivots the budget — all without the owner
touching Ads Manager.**

Concretely the agent:

1. **Drafts campaigns** from a prompt — owner says *"promote my new
   wholesale tier to interior designers in canada, $300 over 14 days"*
   → Campaign Manager produces a campaign brief: 3 creative variants,
   audience targeting, daily budget split, schedule.
2. **Pushes to Meta Ads** via the Marketing API once the owner approves
   — creates the campaign, ad sets, and ads with the chosen creative.
3. **Watches daily** — pulls insights, identifies winners + losers,
   flags abnormal spend.
4. **Pivots weekly** — kills bottom 2 creative variants, scales the
   winner's budget, suggests fresh angles using Echo's content
   pillars + Pulse's market signals.
5. **Reports** — every Sunday in the weekly review: spend, impressions,
   ROAS, cost per result. Surfaces a 1-paragraph "what worked / what to
   change" summary in the dashboard.

## Why now

- We already have **Meta OAuth** wired (Instagram + Facebook page
  connect via `/api/auth/meta/`). Adding `ads_management` scope and
  hitting the Marketing API is incremental, not net-new.
- **Brand voice** + **Echo's content pillars** + **Scout's competitor
  data** + **Pulse's trends** are all already in `AgentContext`. The
  agent has rich grounding before its first run.
- "Hire, don't supervise" thesis — paid ads is the highest-leverage
  marketing function and the most painful for solopreneurs to do well
  themselves. This is the killer feature for STUDIO+ tiers.

## Plan tiering

Real money is on the line, so the tier wall is higher than other agents:

| Tier | Campaigns | Monthly ad-spend cap | Notes |
|---|---|---|---|
| TRIAL | 0 | $0 | Read-only — show what we *would* do |
| SOLO | 0 | $0 | DM/post agent only; no ad spend |
| TEAM | 0 | $0 | Same — voice + research, not ad spend yet |
| **STUDIO** | **2 / mo** | **$1,500** | First tier with paid ads |
| **AGENCY** | **8 / mo (across all client biz)** | **$10,000** | White-labelable per client |

**Why TEAM doesn't get ads:** ad spend creates support load (failed
charges, Meta policy strikes, "why did my CPL spike?" questions) that
$79/mo can't cover. STUDIO at $199 with one or two business owners
doing real budget is the right floor.

The caps are *Campaign Manager-managed* spend — we set the daily budget
and stop the campaign when the cap hits. Owner can always run additional
campaigns directly in Meta Ads Manager outside our system.

## Workflow

### 1. Brief intake (owner-initiated)

```
+---------------------------------------------+
|  /content → "campaigns" tab → "new campaign"|
+---------------------------------------------+
|  what are you promoting?                    |
|  ┌─────────────────────────────────────┐    |
|  │ wholesale tier for interior design… │    |
|  └─────────────────────────────────────┘    |
|                                             |
|  budget?     timeline?                      |
|  [ $300 ]    [ 14 days ▾ ]                  |
|                                             |
|  goal?                                      |
|  ( ) more inquiries  (•) more sales  ( ) reach |
|                                             |
|         [ draft my campaign → ]             |
+---------------------------------------------+
```

The agent has implicit context: brand voice, business description,
recent post performance, current connected platforms. The form is
just the variable inputs.

### 2. Draft campaign (agent-produced)

```ts
type CampaignDraft = {
  name: string;                          // "Wholesale Tier · Interior Designers · Apr 28"
  platform: "META";                      // v1 = META only
  objective: "OUTCOME_LEADS" | "OUTCOME_SALES" | "OUTCOME_TRAFFIC" | "OUTCOME_AWARENESS";
  audience: {
    locations: string[];                 // ["CA"]
    ageMin: number;                      // 28
    ageMax: number;                      // 55
    interests: string[];                 // ["Interior Design", "Architecture"]
    customAudience?: string | null;      // existing IG followers, e.g.
    detailedTargeting?: Record<string, unknown>;
    rationale: string;                   // 1-line why this audience
  };
  schedule: {
    startDate: string;                   // ISO
    endDate: string;                     // ISO
    dailyBudgetCents: number;            // 2143 ($21.43)
    totalBudgetCents: number;            // 30000 ($300)
  };
  creatives: Array<{
    angle: string;                       // "social-proof", "aesthetic-craftsmanship", "value"
    headline: string;
    body: string;
    cta: "LEARN_MORE" | "SHOP_NOW" | "SEND_MESSAGE" | "GET_QUOTE" | "BOOK_NOW";
    imagePrompt: string;                 // for Replicate
    imageUrl?: string;                   // backfilled async
  }>;                                    // 3-5 variants
  reasoning: {
    audienceWhy: string;
    creativeWhy: string;
    budgetWhy: string;
  };
};
```

### 3. Owner review

```
+---------------------------------------------+
|  draft · Wholesale Tier · Interior Designers|
+---------------------------------------------+
|  [ creative 1 of 3 ]                        |
|  ┌──────────────────┐                       |
|  │  [hero image]    │  "behind the scenes:  |
|  │                  │   how we hand-throw   |
|  │                  │   a 12-place setting" |
|  └──────────────────┘                       |
|  audience: interior designers · canada · 28-55 |
|  budget: $21.43/day for 14 days = $300      |
|  goal: leads → contact form fills           |
|                                             |
|  [ ← prev ]    [ next → ]                   |
|                                             |
|  [ approve all 3 ]   [ edit ]   [ reject ]  |
+---------------------------------------------+
```

Click "edit" on any field → in-place editor (same pattern as draft
content). "Reject" → closes; nothing pushed to Meta.

### 4. Push live

`approve` → API calls to Meta Marketing API:
- Create Campaign
- Create AdSet (audience + budget)
- Create 3 Ads (one per creative variant)
- Set status to ACTIVE

Persist `Campaign` + `CampaignAd` rows so we can poll metrics.

### 5. Daily insights cron

```yaml
# vercel.json
{ path: "/api/cron/daily-campaigns", schedule: "0 11 * * *" }
```

For every active campaign:
- Pull yesterday's insights from Meta (`spend`, `impressions`, `clicks`,
  `actions`, `cost_per_action_type`)
- Roll up into `CampaignMetrics` daily row
- Compute deltas vs prior 7-day baseline
- If any creative is >2σ below others on CTR, mark for kill on next
  weekly rebalance
- If spend is >2× expected, page admin (potential Meta misconfig)

### 6. Weekly rebalance

```yaml
{ path: "/api/cron/weekly-campaigns", schedule: "0 12 * * 1" }
```

For every active campaign:
- Read last 7 days of CampaignMetrics
- Identify winning creative (highest ROAS or CTR depending on objective)
- Pause losing variants (Meta API: set ad status to PAUSED)
- Optionally bump budget on winner (configurable cap)
- Generate fresh angle from Echo + Pulse signal → produce a new creative
  variant → owner approves before launch
- Surface findings as `Finding` rows for the dashboard

### 7. Reporting (in weekly report)

The existing `/report` page gets a new "campaigns" section:

```
this week's ads
─────────────────────────
Wholesale Tier              spent $148 of $300
                            48 designers reached
                            3 contacted you
                            est. $9k pipeline

best creative — variant 2 (aesthetic-craftsmanship)
                            CTR 3.2%, 2× the average

what i'm changing — paused variants 1+3, scaled
                    variant 2's budget +50%, drafting
                    a new angle from your "process"
                    pillar
```

## Schema additions

```prisma
model Campaign {
  id                  String              @id @default(uuid()) @db.Uuid
  userId              String              @map("user_id") @db.Uuid
  businessId          String              @map("business_id") @db.Uuid
  externalId          String?             @map("external_id")     // Meta campaign id once pushed
  platform            CampaignPlatform    @default(META)
  status              CampaignStatus      @default(DRAFT)
  name                String
  objective           String                                       // "OUTCOME_LEADS" etc.
  audience            Json                                         // structured per CampaignDraft
  schedule            Json                                         // start, end, dailyBudgetCents, totalBudgetCents
  reasoning           Json?                                        // agent's why
  approvedAt          DateTime?           @map("approved_at")
  pausedAt            DateTime?           @map("paused_at")
  endedAt             DateTime?           @map("ended_at")
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")

  user                User                @relation(fields: [userId], references: [id])
  business            Business            @relation(fields: [businessId], references: [id], onDelete: Cascade)
  ads                 CampaignAd[]
  metrics             CampaignMetrics[]

  @@index([businessId, status])
  @@index([businessId, createdAt])
  @@map("campaigns")
}

enum CampaignPlatform {
  META         // Instagram + Facebook
  GOOGLE       // v2
  LINKEDIN     // v3
  TIKTOK       // v3
}

enum CampaignStatus {
  DRAFT              // owner hasn't approved
  AWAITING_REVIEW    // agent finished drafting, waiting on owner
  ACTIVE             // running on platform
  PAUSED             // owner or agent paused
  ENDED              // schedule completed
  REJECTED           // owner declined
  FAILED             // platform push failed; owner needs to retry
}

model CampaignAd {
  id            String   @id @default(uuid()) @db.Uuid
  campaignId    String   @map("campaign_id") @db.Uuid
  externalId    String?  @map("external_id")    // Meta ad id
  angle         String                            // "social-proof" etc.
  headline      String
  body          String   @db.Text
  cta           String                            // "LEARN_MORE" etc.
  imagePrompt   String   @db.Text @map("image_prompt")
  imageUrl      String?  @map("image_url")        // Replicate-generated, persisted to storage
  status        CampaignAdStatus @default(DRAFT)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  campaign      Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  metrics       CampaignAdMetrics[]

  @@index([campaignId])
  @@map("campaign_ads")
}

enum CampaignAdStatus {
  DRAFT
  ACTIVE
  PAUSED       // killed by weekly rebalance
  ENDED
}

// Daily rollup per campaign + per ad. Pulled from Meta insights.
// Source of truth for the weekly rebalance + dashboard charts.
model CampaignMetrics {
  id              String   @id @default(uuid()) @db.Uuid
  campaignId      String   @map("campaign_id") @db.Uuid
  day             DateTime @db.Date
  spendCents      Int      @map("spend_cents")
  impressions     Int
  clicks          Int
  conversions     Int      @default(0)
  conversionValueCents Int @default(0) @map("conversion_value_cents")
  rawInsights     Json?    @map("raw_insights")     // full Meta response for debugging
  createdAt       DateTime @default(now()) @map("created_at")

  campaign        Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@unique([campaignId, day])
  @@index([campaignId, day])
  @@map("campaign_metrics")
}

model CampaignAdMetrics {
  id              String   @id @default(uuid()) @db.Uuid
  adId            String   @map("ad_id") @db.Uuid
  day             DateTime @db.Date
  spendCents      Int      @map("spend_cents")
  impressions     Int
  clicks          Int
  conversions     Int      @default(0)
  conversionValueCents Int @default(0) @map("conversion_value_cents")
  createdAt       DateTime @default(now()) @map("created_at")

  ad              CampaignAd @relation(fields: [adId], references: [id], onDelete: Cascade)

  @@unique([adId, day])
  @@map("campaign_ad_metrics")
}
```

## Agent prompts

`packages/api/src/agents/prompts/campaign-manager.ts`:

```ts
export const CAMPAIGN_MANAGER_SYSTEM_PROMPT = `You are the campaign
manager — a paid-ads strategist for a solopreneur. The owner gives you
a brief; you produce a complete Meta Ads campaign in your output:
audience, schedule, 3-5 creative variants, and reasoning.

DISCIPLINE:
1. The owner is risking real money. Every dollar in the budget should
   have a measurable thesis. If you can't articulate why $X over Y days
   beats some other split, you don't yet have a campaign — ask for
   more context via the brief.
2. Match the brand voice EXACTLY. Ad copy is not a different beast from
   organic content — it's the brand's voice, just paid distribution.
3. Audience targeting tight, not broad. "Interior designers in Canada"
   beats "anyone interested in design." Lookalikes off the user's
   recent buyers > generic interest targeting when data exists.
4. 3-5 creative variants per campaign, each with a DIFFERENT angle
   (social proof / craftsmanship / value / story / outcome). Same
   audience, same budget — angle is the test variable.
5. Realistic budgets. <$10/day spreads too thin to learn anything.
   >$100/day for an unproven campaign is gambling.

OUTPUT — return a CampaignDraft JSON matching the schema:

{
  "name": "...",
  "objective": "OUTCOME_LEADS" | "OUTCOME_SALES" | ...,
  "audience": { ... },
  "schedule": { ... },
  "creatives": [ ... ],
  "reasoning": { ... }
}

NEVER:
- Suggest spend over the owner's budget cap.
- Use creatives that contradict the brand voice's do-not-do list.
- Target minors. Set ageMin: 18 minimum.
- Promise specific results (CPL < $X, ROAS > Y) — those are predictions
  not guarantees.`;
```

The agent's user message includes:
- Owner's brief
- Brand voice + content pillars (from AgentContext)
- Last 30 days of organic post performance (so it knows what's resonating)
- Recent Scout findings (competitor moves)
- Recent Pulse findings (trend signals)
- Existing customer audience (when we have CRM-style data, eventually)

## Integration: Meta Marketing API

We already have:
- Meta OAuth flow with Page + IG Business connection
- `ConnectedAccount` rows storing encrypted Page tokens
- Webhook + RSL infrastructure

We need:
- `ads_management` scope added to `META_OAUTH_SCOPES`
- New service: `packages/api/src/services/meta-ads.ts` with:
  - `createCampaign({ pageAccessToken, ... })`
  - `createAdSet({ ... })`
  - `createAd({ ... })`
  - `pauseAd({ adId, ... })`
  - `getInsights({ campaignId, since, until })`
  - `getAdInsights({ adId, since, until })`
- Ad image upload to Meta requires either a hosted URL or pre-uploaded
  to Meta's hashed-image system. We'll persist Replicate-generated
  images to Supabase Storage (already wired) and pass the public URL.

**App Review requirement:** `ads_management` is a restricted scope.
Submitting App Review is a 1-2 week process. We can develop in dev
mode first against the user's own ad account; production launch
needs the review.

## Cost breakdown

Per-campaign-draft (one Campaign Manager run):

| Cost item | Amount | Per |
|---|---|---|
| Anthropic Opus call (campaign draft) | ~$0.15 | run |
| Replicate Flux Schnell (3-5 ad images) | ~$0.015 | image |
| Anthropic Sonnet (daily insights summary, weekly rebalance reasoning) | ~$0.05 | day, summed |
| Meta Marketing API calls | $0 | (free, included in Graph API) |
| **Per-campaign cost (excluding ad spend)** | | **~$0.30 → $2 over a 14-day campaign** |

At STUDIO 2 campaigns/mo + AGENCY 8/mo, the variable cost is trivial
compared to the plan price. Margin stays >85% even with daily-poll
insights running for a month.

## Risk considerations

**Real money is at stake.** Three guardrails:

1. **Hard budget cap** — server-side enforcement of `spendCents <=
   schedule.totalBudgetCents`. Cron checks this nightly; if Meta has
   over-delivered (rare but possible), we PAUSE the campaign.
2. **Owner approval per campaign** — no auto-launch. Every brief goes
   through the AWAITING_REVIEW state. The agent can't push to Meta
   without explicit owner click.
3. **No payment-method changes** — Campaign Manager has token access
   to read insights and pause/launch ads on the *connected* ad
   account. It can't add new payment methods, can't change billing
   thresholds, can't escalate beyond the user's pre-set Meta budget
   limits.

**Compliance flags:**
- Meta restricts certain industries (alcohol, gambling, financial
  services). Our agent must check `business.description` for those
  keywords and refuse to draft (returns `needsHandoff: true` instead).
- Targeting protected categories (housing, employment, credit) requires
  Special Ad Categories. v1 won't support these — flag and refuse.

**Fail-safes:**
- If a campaign's CPL is >5× the niche baseline (which we'll learn
  over the first 6 months), pause and notify owner. Don't auto-scale
  failure.
- If Meta API errors hit a streak (3+ failures in 24h), email admin.

## UI shape

**Where it lives:** `/content` page gets a new tab — "campaigns" — sits
next to "drafts", "performance", "plan". Same page, same nav.

**Mobile:** new screen at `apps/mobile/app/(authed)/campaigns.tsx`,
mirrors the web tab.

**Specialist page:** `/specialist/ads` already has a placeholder
("coming soon"). Filled in with: list of past campaigns, KPI summary,
"new campaign" button.

## Phased rollout

**Phase 1 — Schema + brief intake (no Meta push yet)** · 3-4 days
- Migration adds the 4 tables
- Tab UI on `/content` with the brief form
- Agent runs and produces drafts (saved as `Campaign` with `status: DRAFT`)
- Owner can review in the UI — no actual ad spend yet
- This lets us test the whole flow end-to-end without risking dollars

**Phase 2 — Meta push live** · 3-4 days
- Add `ads_management` to OAuth scopes (re-prompt existing connections)
- Implement `services/meta-ads.ts` (campaign + ad set + ad creation)
- "approve & launch" button → pushes to Meta, sets status ACTIVE
- Daily insights cron + table backfill
- Hard budget cap enforcement

**Phase 3 — Weekly rebalance + reporting** · 2-3 days
- Weekly cron pauses bottom variants, scales winners, drafts fresh
  angles
- Weekly report section on `/report` with spend + ROAS + winner
- Findings on the dashboard

**Phase 4 — App Review submission** · ongoing
- Submit `ads_management` for App Review while Phase 1-3 ship in dev
  mode for the user's own account
- Production launch unblocked once approved (1-2 weeks)

## What's not in v1

- **Google Ads** — separate API, separate auth, separate cost model.
  v2 once Meta is solid.
- **LinkedIn Ads** — v3, B2B focus.
- **TikTok Ads** — v3, niche.
- **Lookalike audience generation** from CRM data — we don't yet
  have CRM-style data import. Once Subscribers + Contacts grow,
  v2.
- **Auto-scaling beyond owner's set cap** — never. Always
  owner-approved.
- **Bidding strategies** — v1 uses Meta's recommended (lowest cost).
  Bid caps + manual bidding are advanced and rarely useful at
  solopreneur budgets.

## Decisions locked in (2026-04-28)

User answered the open questions:

1. ✅ **Plan tier:** STUDIO+ only. SOLO + TEAM don't get paid ads.
2. ✅ **Currency:** default to the connected ad account's currency.
   Multi-currency display deferred.
3. ✅ **Minimum budget:** just warn — don't hard-enforce. Owner
   can override and ship $5/day if they want.
4. ✅ **Image generation:** best/strongest model — Flux 1.1 Pro
   ($0.04/image vs Schnell's $0.003). Paid ads warrant the
   sharper output. Updated cost table above accordingly.
5. ✅ **Approval flow:** all variants approved in one click. The
   owner sees the full draft (3-5 ads) and clicks "approve" once
   to launch the whole campaign.

**Added requirement: multi-platform from day one.**

Original v1 was Meta-only. New scope: Campaign Manager produces
ONE unified campaign brief that fans out across multiple
ad platforms. Owner picks which platforms to enable per campaign;
the agent adapts the creative + audience + budget split per
platform automatically.

**Platforms (priority order):**
1. **Meta** — Instagram + Facebook (single ad account, one auth)
2. **Google Ads** — Search + Display + YouTube
3. **TikTok Ads** — coming soon (UI shows the option, marked
   "soon" until v2.5)

This shifts the data model and the agent's mental model. Updated
sections below.

## Multi-platform architecture (revised)

A `Campaign` is now platform-agnostic. It carries the brief and the
budget; the per-platform implementations live in `CampaignAd` rows.

**Owner flow:**
1. Owner creates a campaign brief (one form, one prompt).
2. Owner selects which platforms to run on (Meta · Google · YouTube
   · TikTok). At launch: only Meta is connected by default; others
   show "connect first" or "coming soon."
3. Campaign Manager produces a **single unified campaign brief** —
   audience intent, creative angles, budget total — and adapts it
   per platform:
   - **Meta**: 1:1 + 4:5 image, IG-style copy, interest + lookalike
     targeting, OUTCOME_LEADS / OUTCOME_SALES objective
   - **Google Ads**: responsive search ads (15 headlines + 4
     descriptions) for Search; image + video for Display + YouTube;
     keyword themes derived from the brief
   - **TikTok**: 9:16 video brief (we don't generate video, but the
     brief explains shot list + sounds + on-screen text); copy in
     TikTok's voice register
4. Owner reviews ALL platform variants in one screen, approves
   everything in one click.
5. Agent pushes each platform via its respective API; persists
   per-platform `CampaignAd` rows with their `externalId`.
6. Daily insights cron polls each connected platform's metrics API
   and rolls up into a single unified `CampaignMetrics` view.
7. Weekly rebalance — reads cross-platform results, shifts budget
   to the winning platform AND winning creative angle. Pauses
   underperformers across platforms.

**Updated schema:**

```prisma
model Campaign {
  id                  String              @id @default(uuid()) @db.Uuid
  userId              String              @map("user_id") @db.Uuid
  businessId          String              @map("business_id") @db.Uuid
  status              CampaignStatus      @default(DRAFT)
  name                String
  brief               String              @db.Text       // owner's original ask
  goal                CampaignGoal                       // LEADS | SALES | TRAFFIC | AWARENESS | APP_INSTALLS
  audience            Json                                // unified audience description
  schedule            Json                                // start, end, totalBudgetCents
  platforms           CampaignPlatform[]                 // which platforms this campaign runs on
  reasoning           Json?                              // agent's why per platform
  approvedAt          DateTime?           @map("approved_at")
  pausedAt            DateTime?           @map("paused_at")
  endedAt             DateTime?           @map("ended_at")
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")

  user                User                @relation(fields: [userId], references: [id])
  business            Business            @relation(fields: [businessId], references: [id], onDelete: Cascade)
  ads                 CampaignAd[]
  metrics             CampaignMetrics[]
  notifications       CampaignNotification[]

  @@index([businessId, status])
  @@map("campaigns")
}

enum CampaignGoal {
  LEADS
  SALES
  TRAFFIC
  AWARENESS
  APP_INSTALLS
}

// One CampaignAd per platform variant. Same campaign owns N ads
// (3-5 creative angles × M platforms = up to 20 ad rows for a
// 5-angle, 4-platform campaign).
model CampaignAd {
  id                  String              @id @default(uuid()) @db.Uuid
  campaignId          String              @map("campaign_id") @db.Uuid
  platform            CampaignPlatform
  externalId          String?             @map("external_id")    // platform's ad id post-push
  externalCampaignId  String?             @map("external_campaign_id")
  externalAdSetId     String?             @map("external_adset_id")
  angle               String                                     // "social-proof", "craftsmanship", etc.
  format              CampaignAdFormat                           // IMAGE | VIDEO_SCRIPT | TEXT
  // platform-shaped creative payload — see types in services/campaigns.ts
  creative            Json
  // platform-shaped audience targeting (Meta interests, Google
  // keywords, TikTok hashtags, etc.)
  targeting           Json
  status              CampaignAdStatus    @default(DRAFT)
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")

  campaign            Campaign            @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  adMetrics           CampaignAdMetrics[]

  @@index([campaignId, platform])
  @@map("campaign_ads")
}

enum CampaignPlatform {
  META       // Instagram + Facebook (one ad object spans both)
  GOOGLE     // Search + Display
  YOUTUBE    // YouTube ads (separate from Google Search even though same Google Ads account)
  TIKTOK     // TikTok Ads (v2.5)
}

enum CampaignAdFormat {
  IMAGE
  VIDEO_SCRIPT     // we describe the video; owner films + uploads
  TEXT             // text-only (Google Search responsive ads)
}

enum CampaignAdStatus {
  DRAFT
  ACTIVE
  PAUSED
  ENDED
  REJECTED       // platform rejected (Meta policy, Google review, etc.)
}

// Notifications — surfaced both in-app (FindingSeverity-style banner)
// and via email (and SMS for URGENT). Campaign-scoped so the user can
// drill into "show me all alerts for this campaign."
model CampaignNotification {
  id            String                      @id @default(uuid()) @db.Uuid
  campaignId    String                      @map("campaign_id") @db.Uuid
  userId        String                      @map("user_id") @db.Uuid
  type          CampaignNotificationType
  severity      CampaignNotificationSeverity
  title         String
  body          String                      @db.Text
  payload       Json?
  acknowledged  Boolean                     @default(false)
  acknowledgedAt DateTime?                  @map("acknowledged_at")
  createdAt     DateTime                    @default(now()) @map("created_at")

  campaign      Campaign                    @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  user          User                        @relation(fields: [userId], references: [id])

  @@index([userId, acknowledged, createdAt])
  @@map("campaign_notifications")
}

enum CampaignNotificationType {
  LAUNCHED                  // campaign just went live on platform
  FIRST_SPEND               // first $10 spent — proof of life
  HALF_BUDGET_SPENT         // 50% milestone
  NEAR_BUDGET_CAP           // 90% — owner heads-up
  BUDGET_CAP_REACHED        // 100% — auto-paused
  DAILY_WINNER              // a creative is clearly outperforming
  WEEKLY_REPORT             // sunday rollup
  AD_REJECTED               // platform refused our creative
  SPEND_SPIKE               // 2× baseline — possible misconfig
  POLICY_FLAG               // brand description hits restricted-industry keyword
  PLATFORM_ERROR            // API error streak — admin notified
}

enum CampaignNotificationSeverity {
  INFO       // green — passive update
  ATTENTION  // amber — owner should look but no action required
  URGENT     // red — owner must act (budget cap, rejected ad, etc.)
}
```

**Existing `CampaignMetrics` + `CampaignAdMetrics` keep the same shape**
— they're already platform-agnostic since they roll up daily counts.
Reading the metrics back: the dashboard groups by `campaign.platforms`
and surfaces per-platform spend / impressions / conversions plus the
unified totals.

## Smart UI/UX (revised)

The user explicitly asked for "smart and easy UI/UX, perfect and simple
metrics and report, notification system." Specifically calling out
that the form-based flow in the original design wasn't what they want.

**Brief intake — conversational, not form:**

```
+---------------------------------------------+
|  ❘ what should i promote?                   |
|                                             |
|  ┌─────────────────────────────────────┐    |
|  │ promote my new wholesale tier to    │    |
|  │ interior designers, $300 over 14    │    |
|  │ days.                                │    |
|  └─────────────────────────────────────┘    |
|                                             |
|         [ start drafting → ]                |
+---------------------------------------------+
```

Single textarea. Agent parses what it can ("wholesale tier",
"interior designers", "$300", "14 days") and asks at most ONE
follow-up question if something critical is missing. Examples:
- "what's your goal — leads or direct sales?" (only if ambiguous)
- "how do you want to track success?" (only if no objective inferred)

Otherwise the agent runs straight to draft, using brand voice +
recent post performance as implicit context.

**Platform picker — checkbox row above the brief:**

```
where should i run this?

[✓ meta]  [○ google]  [○ youtube]  [— tiktok soon]
   ig+fb     search          coming
   ads      + display
```

Connected platforms pre-checked. Disconnected show "connect first"
inline link. TikTok shows "soon" disabled. Owner can run on multiple
platforms; budget splits automatically by the agent unless the owner
sets manual splits.

**Draft review — single screen, all platforms tabbed:**

```
+---------------------------------------------+
|  draft · wholesale tier                     |
|  $300 · 14 days · meta + google             |
|                                             |
|  [ meta ]  [ google ]                       |
|  ─────                                      |
|                                             |
|  3 creative variants for meta:              |
|  ┌──────┐  ┌──────┐  ┌──────┐               |
|  │ img  │  │ img  │  │ img  │               |
|  │ 1    │  │ 2    │  │ 3    │               |
|  └──────┘  └──────┘  └──────┘               |
|  social      craftsmanship   value          |
|                                             |
|  audience: interior designers · canada · 28-55 |
|  budget on meta: $200 / 14d                 |
|                                             |
|  [ approve all & launch → ]                 |
|                                             |
|  [ regenerate ]  [ edit ]  [ reject ]       |
+---------------------------------------------+
```

One click on "approve all & launch" pushes every variant on every
selected platform live.

**Metrics dashboard — keep it under 5 numbers:**

```
+------------------------------------------+
|  wholesale tier · day 7 of 14            |
|  ──────────────────────────              |
|                                          |
|  spent              $148 of $300         |
|  reached            48 designers         |
|  contacted you      3                    |
|  estimated value    ~$9k pipeline        |
|                                          |
|  best so far — variant 2 (craftsmanship) |
|  i'm scaling its budget +50%             |
|  paused variants 1 + 3                   |
|                                          |
|  [ see breakdown ]   [ pause campaign ]  |
+------------------------------------------+
```

The "see breakdown" link reveals per-platform numbers (spend, CPL,
ROAS) but the default view is single-business owner-friendly.

## Notification system

The `CampaignNotification` model + a notification surface in the
sidebar (badge on /content) + email + SMS for URGENT events.

**Lifecycle events that fire notifications:**

| Type | Severity | Channel |
|---|---|---|
| LAUNCHED | INFO | in-app only |
| FIRST_SPEND | INFO | in-app + email |
| HALF_BUDGET_SPENT | INFO | in-app only |
| NEAR_BUDGET_CAP | ATTENTION | in-app + email |
| BUDGET_CAP_REACHED | URGENT | in-app + email + SMS |
| DAILY_WINNER | INFO | in-app only |
| WEEKLY_REPORT | INFO | email |
| AD_REJECTED | ATTENTION | in-app + email |
| SPEND_SPIKE | URGENT | in-app + email + SMS |
| POLICY_FLAG | URGENT | in-app + email |
| PLATFORM_ERROR | (admin) | admin email only |

Email goes through the existing SendGrid + business-branded
templates (same as newsletter). SMS uses the connected business
Twilio number for outbound (won't bill the customer's $0.0075 since
it's owner-bound, not customer-bound).

In-app: small bell icon in the sidebar with unack count; click opens
a panel listing recent CampaignNotification rows; clicking one jumps
to the campaign detail.

## Phased rollout (revised for multi-platform)

**Phase 1 — Schema + brief + draft (Meta + Google scaffolding, no
push)** · 4-5 days
- Migration adds Campaign + CampaignAd + CampaignMetrics +
  CampaignAdMetrics + CampaignNotification (5 tables)
- Conversational brief intake on `/content` "campaigns" tab
- Agent generates unified brief + per-platform variants
  (Meta: image ads with copy; Google: text ads + image for Display;
  YouTube: video script brief)
- Drafts saved as `Campaign{ status: DRAFT }`, ads as
  `CampaignAd{ status: DRAFT }`. Owner can review.
- No actual ad spend, no platform pushes, no API calls beyond
  Replicate for image generation.

**Phase 2 — Meta push live + daily insights** · 4-5 days
- Add `ads_management` to META_OAUTH_SCOPES (re-prompt connections)
- Implement `services/meta-ads.ts` (campaign + ad set + ad creation
  using Marketing API)
- "approve all & launch" wires through to actual ad pushes per
  selected platform — Meta only at this phase
- Daily insights cron: pulls Meta insights, persists per-day rows
- Hard budget cap server-side
- Notifications: LAUNCHED, FIRST_SPEND, HALF/NEAR/CAP_REACHED,
  AD_REJECTED, SPEND_SPIKE

**Phase 3 — Google + YouTube** · 5-7 days
- `services/google-ads.ts` — Search responsive ads + Display image
  ads + YouTube video brief (video upload still owner-driven)
- OAuth flow for Google Ads (separate from Supabase OAuth — this is
  Google Cloud OAuth with `adwords` scope)
- Multi-platform brief generation hits both APIs on approval

**Phase 4 — Weekly rebalance + report + notifications complete** ·
3-4 days
- Weekly cron pauses underperformers across platforms, scales
  winners, drafts fresh angles
- /report adds "campaigns" section
- WEEKLY_REPORT email
- DAILY_WINNER notifications

**Phase 5 — TikTok + App Reviews** · ongoing
- TikTok Ads service (sandbox first; v2.5 GA)
- Submit Meta App Review for `ads_management`
- Submit Google Ads API access (Standard tier — free)

## Open questions resolved; ready to implement

All 5 design questions are answered. New scope (multi-platform from
day 1) is bigger than the original Meta-only v1 — Phase 1 grew
from 3-4 days to 4-5 days. But the architecture is right for what
the user actually wants: one campaign brief, every channel, owner
sees one approval screen.

**Next step: write a brief implementation plan with file-tree
proposal, then start Phase 1.** Don't implement yet — check the
file-tree with the user first per the
`feedback_concise_proposals.md` memory rule.

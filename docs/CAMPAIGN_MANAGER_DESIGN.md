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

## Open questions to confirm before implementing

1. **Plan tier confirmation** — STUDIO+ only? Or do we want a "TEAM
   Lite" version that drafts campaigns but the owner has to push to
   Meta themselves (no Marketing API integration on TEAM)?
2. **Currency** — defaulting to the connected ad account's currency.
   Multi-currency display in the UI?
3. **Minimum budget** — recommend $7-10/day floor below which Meta
   barely delivers. Hard-enforce or just warn?
4. **Image generation** — stick with Replicate Flux Schnell? Or upgrade
   to Flux 1.1 Pro for ad creatives specifically (paid ads = higher
   bar)? Cost difference: $0.003 vs $0.04 per image.
5. **Approval flow** — does owner approve all variants at once or per
   variant?

When you're ready, reply with answers to those 5 questions + "go" and
I'll start Phase 1 (schema + migration + brief intake).

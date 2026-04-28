---
title: Echo workflow + cost
last_updated: 2026-04-28
---

# Echo — workflow + cost

How and when Echo (the content agent) produces drafts, and why the
current cadence is **1 per user per day**.

## The pipeline (what runs, in order)

1. **Strategist** (quarterly cron, `0 7 * * 1`) — refreshes brand voice
   if it's older than 90 days. One Anthropic Opus call.
2. **Planner** (weekly, currently fires inside the daily cron) — looks
   at recent post performance, brand voice, and content pillars to
   decide what should be posted this week (mix of formats, days, hours).
3. **Echo** (daily cron, `0 10 * * *`) — for every eligible user, runs
   `generateDailyContent` exactly once → produces **one** draft.

Every draft carries:
- A brief (intent, audience, content pillar, hook framework)
- The primary content (single-post, carousel, reel, newsletter, or
  story sequence)
- An A/B variant (also a full Echo run, on the same brief)
- A hero image (Replicate Flux Schnell, generated in the background
  after the draft is created — that's why the image takes a few
  seconds to appear)
- A `voiceMatchScore` self-evaluation (0–1)

Drafts land in `/content` under "needs your eyes". The user approves,
edits, or rejects. Approved drafts move to "scheduled" and get
published when their `scheduledFor` time hits.

## Why only 1 per day per user

Two reasons:

### 1. Plan economics

Each Echo run consumes credits from a per-plan monthly quota
(`packages/api/src/services/quota.ts`):

| Plan    | Monthly credits | Avg cost / draft (incl. variant + image) |
|---------|-----------------|------------------------------------------|
| TRIAL   | 20              | ~$0.04 LLM + ~$0.003 image = **~$0.04** |
| SOLO    | 60              | same                                     |
| TEAM    | 200             | same                                     |
| STUDIO  | 800             | same                                     |

A draft = 1 ECHO_DRAFT credit + 1 ECHO_VARIANT credit + 1 Replicate
image. At 1 draft/day × 30 days = **60 credits/month**, which exactly
fills SOLO. TEAM and STUDIO users currently underuse their cap because
the cron is one-size-fits-all.

### 2. The "hire, don't supervise" thesis

A single draft per day is what most solopreneurs can actually review
and ship. Pushing 5/day fills the inbox, doesn't get reviewed, and the
user feels they're failing to keep up. We chose 1/day intentionally
based on prototype testing — it matches the cadence of someone doing
this manually.

## How a user can get more drafts today

- **"write me one →" button** on `/content` — fires
  `content.generate` immediately. Format + platform are configurable.
  Counts against monthly credits like the cron.
- **Approved drafts get scheduled** by Planner across the week, so a
  user can have 5 drafts queued at once even if Echo only added one
  today.

## How to scale up (when we decide to)

Cleanest path is plan-tiered cadence. Add a `DRAFTS_PER_DAY` table:

```ts
const DRAFTS_PER_DAY: Record<Plan | "TRIAL", number> = {
  TRIAL: 1,
  SOLO: 1,
  TEAM: 2,
  STUDIO: 4,
};
```

Then in `daily-content` cron loop, run `generateDailyContent` N times
per user (each picks a different format/platform via Planner's queue)
instead of once. Honor the monthly credit cap so heavy days don't
exhaust the quota mid-month.

Two follow-ups before we ship that:
1. Planner needs to actually produce 4 distinct briefs per day for
   STUDIO without repeating the same hook. Today it produces 1.
2. UI needs grouping in `/content` so 4 drafts/day don't feel like
   spam — likely a "today's drafts" group + a collapse toggle.

## Cost surfaces

- Per-user financials: admin dashboard (`/admin/dashboard/users/[id]`)
  shows actual Anthropic + Replicate spend, not estimates. The
  `recordAnthropicUsage` call in every agent run logs token counts to
  `AgentEvent`; pricing is computed from `MODEL_PRICING` in
  `services/pricing.ts`.
- Replicate image cost is logged separately (1¢ per Flux Schnell image)
  so the Anthropic-only LLM bucket doesn't include images.

## TL;DR

Echo creates 1/day because that's what most users can act on, and
because the SOLO plan ($39/mo) is sized for exactly that. Higher tiers
have headroom to do more — that's a feature we'll wire up once Planner
can produce more distinct briefs per day. Until then, "write me one"
is the on-demand escape hatch.

// Multi-layer guard against bot/spam DM floods that would burn Anthropic
// credits. Three independent layers; the inbound handler short-circuits on
// the first one that fires.
//
//   Layer 1 — per-sender rate limit
//     Bucket on (userId, channel, fromAddress). 5 / 5min, 30 / 1h, 100 / 24h.
//     Source-of-truth: the Message table (we already persist every inbound,
//     so a COUNT query is enough — no new table).
//
//   Layer 2 — per-account daily signal budget
//     Cap on the number of signal runs per user per 24h. Bounded regardless
//     of how many sock puppets the attacker uses.
//     Source-of-truth: AgentEvent rows where agent=SIGNAL (already populated
//     by recordAnthropicUsage + handler events).
//
//   Layer 3 — trivial / duplicate message filter
//     Before any DB call: drop messages shorter than 2 chars, single-char
//     repeats ("aaaaaa"), and exact-duplicate retries from the same sender
//     within the last 60 minutes (Telegram retries on non-2xx and we don't
//     want each retry to count as a new fresh request).

import { db, type MessageChannel, type Plan } from "@orb/db";

const MIN_BODY_LENGTH = 2;

const SENDER_WINDOWS = [
  { ms: 5 * 60 * 1000, max: 5, label: "5min" },
  { ms: 60 * 60 * 1000, max: 30, label: "1h" },
  { ms: 24 * 60 * 60 * 1000, max: 100, label: "24h" },
] as const;

// Daily ceilings on signal calls per user. Tuned conservatively — a real
// solopreneur shouldn't hit these in a normal day. Adjust after observing
// real traffic.
const DAILY_SIGNAL_CAP: Record<Plan | "TRIAL", number> = {
  TRIAL: 200,
  SOLO: 500,
  TEAM: 1500,
  STUDIO: 5000,
  AGENCY: 15000,
};

export type GuardResult =
  | { allow: true }
  | {
      allow: false;
      reason:
        | "trivial_body"
        | "duplicate"
        | "rate_limit_5min"
        | "rate_limit_1h"
        | "rate_limit_24h"
        | "daily_signal_cap";
      detail?: string;
    };

// Cheap pre-DB checks. Pure: callers can run this on the raw webhook body
// before doing any database work to short-circuit obvious garbage.
export function isTrivialBody(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length < MIN_BODY_LENGTH) return true;
  // Single repeated character / punctuation flood
  if (/^(.)\1+$/.test(trimmed) && trimmed.length < 10) return true;
  return false;
}

// Combined guard. Run inside the inbound handler before any LLM call.
export async function guardInbound(args: {
  userId: string;
  channel: MessageChannel;
  fromAddress: string;
  body: string;
  // Caller's current plan. Pass "TRIAL" for users without a subscription.
  plan: Plan | "TRIAL";
}): Promise<GuardResult> {
  // Layer 3a — trivial body
  if (isTrivialBody(args.body)) {
    return { allow: false, reason: "trivial_body" };
  }

  // Layer 3b — exact duplicate of the last inbound from this sender within
  // the last hour (handles Telegram-style retries + lazy spam).
  const lastInbound = await db.message.findFirst({
    where: {
      userId: args.userId,
      channel: args.channel,
      fromAddress: args.fromAddress,
      direction: "INBOUND",
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    select: { body: true },
  });
  if (lastInbound && lastInbound.body.trim() === args.body.trim()) {
    return { allow: false, reason: "duplicate" };
  }

  // Layer 1 — per-sender sliding-window rate limit. Fire the strictest
  // window first; counts include the *current* message (we haven't
  // persisted it yet, so we'll add 1 to the threshold check).
  for (const win of SENDER_WINDOWS) {
    const count = await db.message.count({
      where: {
        userId: args.userId,
        channel: args.channel,
        fromAddress: args.fromAddress,
        direction: "INBOUND",
        createdAt: { gte: new Date(Date.now() - win.ms) },
      },
    });
    if (count >= win.max) {
      return {
        allow: false,
        reason: `rate_limit_${win.label}` as const,
        detail: `${count} inbounds in ${win.label}`,
      };
    }
  }

  // Layer 2 — per-account daily signal budget. We count agentEvents emitted
  // by signal handlers so it tracks LLM-bearing work, not just inbound
  // volume.
  const cap = DAILY_SIGNAL_CAP[args.plan];
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const signalRuns = await db.agentEvent.count({
    where: {
      userId: args.userId,
      agent: "SIGNAL",
      createdAt: { gte: dayAgo },
    },
  });
  if (signalRuns >= cap) {
    return {
      allow: false,
      reason: "daily_signal_cap",
      detail: `${signalRuns}/${cap} signal runs in 24h`,
    };
  }

  return { allow: true };
}

// Resolve the user's effective plan for guard purposes.
//
// Both ACTIVE and TRIALING count — once Stripe is collecting card info on
// a trial, we treat the user as on that plan (the older "TRIALING ⇒ TRIAL
// tier" rule blocked campaigns for users mid-trial on STUDIO).
//
// If multiple subs exist (e.g. an upgrade attempt spawned a duplicate),
// pick the highest tier among them — the user's effective access should
// reflect the best plan they're paying for, not whichever was created last.
const PLAN_RANK: Record<Plan, number> = {
  SOLO: 1,
  TEAM: 2,
  STUDIO: 3,
  AGENCY: 4,
};

export async function effectivePlan(userId: string): Promise<Plan | "TRIAL"> {
  const subs = await db.subscription.findMany({
    where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
    select: { plan: true },
  });
  if (subs.length === 0) return "TRIAL";
  return subs.reduce<Plan>(
    (best, s) => (PLAN_RANK[s.plan] > PLAN_RANK[best] ? s.plan : best),
    subs[0]!.plan,
  );
}

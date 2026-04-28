import { db, Plan } from "@orb/db";
import { OrbError } from "../errors";

// Plan → monthly credit allowance.
// Costs of typical operations (in credits):
//   Echo draft (any format)     1
//   Echo A/B variant            +1
//   Manual run-now              1
//   Strategist refresh          2
//   Planner weekly plan         2
//   Pulse / Scout cron          1 each
//   Newsletter send             1 per 100 recipients (min 1)
//   Image generation (future)   5 each
//
// 2026-04-28 pricing reshape: trial is now full TEAM access (50 credits +
// 5 voice calls) for 7 days; tiers redesigned around capability gates,
// not just credit caps. AGENCY is the new multi-business tier.
export const PLAN_LIMITS: Record<"TRIAL" | Plan, number> = {
  TRIAL: 50,
  SOLO: 60,
  TEAM: 250,
  STUDIO: 600,
  AGENCY: 2000,
};

// Voice/SMS calls are the highest-cost operation per use ($0.50–$1.50
// each via Vapi + Twilio), so they get their own monthly cap separate
// from the LLM credit pool. Trial is capped at 5 to demonstrate the
// feature without burning $50 of voice on a tire-kicker.
export const VOICE_CALL_LIMITS: Record<"TRIAL" | Plan, number> = {
  TRIAL: 5,
  SOLO: 0, // SOLO is DM-only; no voice calls
  TEAM: 100,
  STUDIO: 250,
  AGENCY: 600,
};

export const CREDIT_COSTS = {
  ECHO_DRAFT: 1,
  ECHO_VARIANT: 1,
  MANUAL_RUN: 1,
  STRATEGIST_REFRESH: 2,
  PLANNER: 2,
  PULSE_RUN: 1,
  SCOUT_RUN: 1,
  IMAGE_GEN: 5,
  NEWSLETTER_PER_100: 1,
} as const;

export type PlanKey = "TRIAL" | Plan;

// Returns 'YYYY-MM' for the given date in UTC. Periods are calendar-month
// aligned, regardless of when the subscription started, to keep reset
// behaviour intuitive (everyone resets on the 1st).
export function periodFor(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// 1st of next month at 00:00 UTC — the natural reset boundary.
export function nextResetAt(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

// Resolves the user's plan-key for quota purposes. With multiple subs
// (e.g. an upgrade attempt spawned a duplicate before we added the
// active-sub guard), pick the highest tier — the user paid for the
// best plan they hold, so quota should reflect that.
const PLAN_RANK: Record<PlanKey, number> = {
  TRIAL: 0,
  SOLO: 1,
  TEAM: 2,
  STUDIO: 3,
  AGENCY: 4,
};

async function resolvePlanKey(userId: string): Promise<PlanKey> {
  const subs = await db.subscription.findMany({
    where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    select: { plan: true },
  });
  if (subs.length === 0) return "TRIAL";
  return subs.reduce<PlanKey>(
    (best, s) =>
      PLAN_RANK[s.plan as PlanKey] > PLAN_RANK[best] ? (s.plan as PlanKey) : best,
    subs[0]!.plan as PlanKey,
  );
}

// Looks up (or initializes) the current period's row for a user.
//
// Self-healing: if an UPGRADE happened mid-period and the stripe webhook
// didn't bump our cap (e.g. duplicate sub edge case, missed delivery),
// we'll detect on next read that the user's resolved plan is higher
// than the stored snapshot and raise creditsLimit + plan to match. We
// never lower the cap — the user already paid for the higher tier this
// period, even on a downgrade.
async function getOrCreatePeriodRow(userId: string) {
  const period = periodFor();
  const existing = await db.userUsage.findUnique({
    where: { userId_period: { userId, period } },
  });

  if (existing) {
    const resolved = await resolvePlanKey(userId);
    const resolvedLimit = PLAN_LIMITS[resolved];
    if (resolvedLimit > existing.creditsLimit) {
      return db.userUsage.update({
        where: { id: existing.id },
        data: { creditsLimit: resolvedLimit, plan: resolved },
      });
    }
    return existing;
  }

  const planKey = await resolvePlanKey(userId);
  return db.userUsage.create({
    data: {
      userId,
      period,
      creditsLimit: PLAN_LIMITS[planKey],
      plan: planKey,
    },
  });
}

export type UsageInfo = {
  period: string;
  plan: PlanKey;
  creditsUsed: number;
  creditsLimit: number;
  remaining: number;
  pctUsed: number;
  exhausted: boolean;
  resetsAt: Date;
};

export async function getCurrentUsage(userId: string): Promise<UsageInfo> {
  const row = await getOrCreatePeriodRow(userId);
  const used = Number(row.creditsUsed);
  return {
    period: row.period,
    plan: row.plan as PlanKey,
    creditsUsed: used,
    creditsLimit: row.creditsLimit,
    remaining: Math.max(0, row.creditsLimit - used),
    pctUsed: Math.min(100, Math.round((used / row.creditsLimit) * 100)),
    exhausted: used >= row.creditsLimit,
    resetsAt: nextResetAt(),
  };
}

// Reserves `amount` credits or throws. Use BEFORE running expensive ops
// so we don't charge users for something they didn't get. If the call
// fails after consume, the credits are spent — that's intentional, same
// as Anthropic / OpenAI.
export async function consumeCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<UsageInfo> {
  const row = await getOrCreatePeriodRow(userId);
  const used = Number(row.creditsUsed);
  if (used + amount > row.creditsLimit) {
    throw OrbError.RATE_LIMIT(
      `You've used your ${row.plan.toLowerCase()} plan allowance for ${row.period}. Upgrade or wait until ${nextResetAt()
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        .toLowerCase()} for a fresh allowance.`,
    );
  }
  const updated = await db.userUsage.update({
    where: { id: row.id },
    data: { creditsUsed: { increment: amount } },
  });
  // Best-effort log. Non-fatal if it fails.
  await db.agentEvent
    .create({
      data: {
        userId,
        agent: "STRATEGIST", // generic — quota is cross-agent
        eventType: "credits_consumed",
        payload: { amount, reason, period: row.period },
      },
    })
    .catch(() => undefined);

  const newUsed = Number(updated.creditsUsed);
  return {
    period: row.period,
    plan: row.plan as PlanKey,
    creditsUsed: newUsed,
    creditsLimit: row.creditsLimit,
    remaining: Math.max(0, row.creditsLimit - newUsed),
    pctUsed: Math.min(100, Math.round((newUsed / row.creditsLimit) * 100)),
    exhausted: newUsed >= row.creditsLimit,
    resetsAt: nextResetAt(),
  };
}

// Read-only check. Use to bail early before expensive prep work.
export async function assertHasCredits(
  userId: string,
  amount: number,
): Promise<void> {
  const usage = await getCurrentUsage(userId);
  if (usage.creditsUsed + amount > usage.creditsLimit) {
    throw OrbError.RATE_LIMIT(
      `Not enough credits this ${usage.period}. Used ${usage.creditsUsed} / ${usage.creditsLimit}. Resets ${usage.resetsAt
        .toLocaleDateString("en-US", { month: "short", day: "numeric" })
        .toLowerCase()}.`,
    );
  }
}

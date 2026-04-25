import { NextResponse } from "next/server";
import { db, Agent } from "@orb/db";
import {
  runStrategist,
  recordAnthropicUsage,
  summarizePerformance,
  type BrandVoice,
} from "@orb/api";

// Runs weekly. Refreshes Strategist for anyone whose brand voice is
// older than 90 days. Sized so the work spreads naturally — a user who
// onboarded 3 months ago refreshes now; new users wait their turn.
//
// Note: this bypasses the credit-quota check on purpose — it's an
// adfi-initiated refresh, not a user-initiated run, so we don't want to
// silently eat the user's quota for something they didn't ask for.

export const runtime = "nodejs";
export const maxDuration = 300;

const DAYS_BEFORE_REFRESH = 90;

function unauthorized(): NextResponse {
  return new NextResponse("unauthorized", { status: 401 });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return unauthorized();
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const cutoff = new Date(Date.now() - DAYS_BEFORE_REFRESH * 24 * 60 * 60 * 1000);

  const eligible = await db.user.findMany({
    where: {
      deletedAt: null,
      businessDescription: { not: null },
      goal: { not: null },
      subscriptions: {
        some: { status: { in: ["TRIALING", "ACTIVE"] } },
      },
      OR: [
        { agentContext: { lastRefreshedAt: null } },
        { agentContext: { lastRefreshedAt: { lt: cutoff } } },
      ],
      // Skip users whose Strategist voice was paused.
      NOT: { agentContext: { pausedAgents: { has: Agent.STRATEGIST } } },
    },
    include: { agentContext: true },
    take: 50, // bound the batch so we don't blow up the function
  });

  let refreshed = 0;
  let failed = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const user of eligible) {
    try {
      const performance = await summarizePerformance(user.id, 90);
      const previousVoice =
        (user.agentContext?.strategistOutput as BrandVoice | null) ?? null;
      const voice = await runStrategist({
        businessDescription: user.businessDescription!,
        goal: user.goal!,
        userId: user.id,
        previousVoice,
        performance,
      });
      await db.agentContext.update({
        where: { userId: user.id },
        data: {
          strategistOutput: voice as object,
          lastRefreshedAt: new Date(),
        },
      });
      await db.agentEvent.create({
        data: {
          userId: user.id,
          agent: Agent.STRATEGIST,
          eventType: "strategist_quarterly_refresh",
          payload: {
            previousRefresh:
              user.agentContext?.lastRefreshedAt?.toISOString() ?? null,
          },
        },
      });
      refreshed++;
    } catch (err) {
      failed++;
      errors.push({
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    eligible: eligible.length,
    refreshed,
    failed,
    errors,
    cutoff: cutoff.toISOString(),
  });
}

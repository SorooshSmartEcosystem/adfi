import { db, Agent } from "@orb/db";

export type CronRunResult = {
  totalEligible: number;
  skippedPaused: number;
  successful: number;
  failed: number;
  errors: { userId: string; message: string }[];
  durationMs: number;
};

// Runs an agent orchestration function for every eligible user (active
// subscription + brand voice set), skipping users who have paused this
// specific agent. Catches per-user errors so one bad run doesn't abort the
// batch. Called by cron route handlers in apps/web.
export async function runAgentForAllEligibleUsers(
  agent: Agent,
  agentFn: (userId: string) => Promise<unknown>,
): Promise<CronRunResult> {
  const started = Date.now();

  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      agentContext: { strategistOutput: { not: { equals: null } } },
      subscriptions: {
        some: { status: { in: ["TRIALING", "ACTIVE"] } },
      },
    },
    select: {
      id: true,
      agentContext: { select: { pausedAgents: true } },
    },
  });

  const result: CronRunResult = {
    totalEligible: users.length,
    skippedPaused: 0,
    successful: 0,
    failed: 0,
    errors: [],
    durationMs: 0,
  };

  for (const user of users) {
    if (user.agentContext?.pausedAgents?.includes(agent)) {
      result.skippedPaused++;
      continue;
    }
    try {
      await agentFn(user.id);
      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        userId: user.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  result.durationMs = Date.now() - started;
  return result;
}

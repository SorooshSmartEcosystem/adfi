import { z } from "zod";
import { Agent } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { generatePulseSignals } from "../agents/pulse";
import { generateCompetitorIntel } from "../agents/scout";
import { generateDailyContent } from "../agents/echo";
import { runStrategist } from "../agents/strategist";
import { db } from "@orb/db";

// Agents users can control directly. Strategist runs at onboarding; Signal
// is event-driven (webhook). Everything else can be paused and manually run.
const ControllableAgent = z.enum(["PULSE", "SCOUT", "ECHO", "STRATEGIST"]);

export const agentRouter = router({
  // Returns paused state + last-run metadata so /specialist/[id] can show
  // correct status + disable run-now while a run is in progress.
  getSettings: authedProc.input(z.void()).query(async ({ ctx }) => {
    const ctxRow = await ctx.db.agentContext.findUnique({
      where: { userId: ctx.user.id },
      select: { pausedAgents: true, lastManualRun: true, lastRefreshedAt: true },
    });
    return {
      pausedAgents: ctxRow?.pausedAgents ?? [],
      lastManualRun: ctxRow?.lastManualRun ?? null,
      lastRefreshedAt: ctxRow?.lastRefreshedAt ?? null,
    };
  }),

  pause: authedProc
    .input(z.object({ agent: ControllableAgent }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.agentContext.findUnique({
        where: { userId: ctx.user.id },
      });
      if (!row) throw OrbError.NOT_FOUND("agent context");

      const next = Array.from(
        new Set([...(row.pausedAgents ?? []), input.agent as Agent]),
      );
      await ctx.db.agentContext.update({
        where: { userId: ctx.user.id },
        data: { pausedAgents: next },
      });
      return { pausedAgents: next };
    }),

  resume: authedProc
    .input(z.object({ agent: ControllableAgent }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.agentContext.findUnique({
        where: { userId: ctx.user.id },
      });
      if (!row) throw OrbError.NOT_FOUND("agent context");

      const next = (row.pausedAgents ?? []).filter((a) => a !== input.agent);
      await ctx.db.agentContext.update({
        where: { userId: ctx.user.id },
        data: { pausedAgents: next },
      });
      return { pausedAgents: next };
    }),

  // Runs the agent immediately for this user. Used by the 'run now' button
  // on the specialist page. Surfaces the real error if the agent throws so
  // the UI can show it (useful during debugging).
  runNow: authedProc
    .input(z.object({ agent: ControllableAgent }))
    .mutation(async ({ ctx, input }) => {
      const startedAt = new Date();
      let result: unknown;
      let errorMessage: string | null = null;

      try {
        switch (input.agent) {
          case "PULSE":
            result = await generatePulseSignals(ctx.user.id);
            break;
          case "SCOUT":
            result = await generateCompetitorIntel(ctx.user.id);
            break;
          case "ECHO":
            // Skip A/B variant on manual run-now so the button comes back
            // in ~30s instead of ~60s. Cron-driven generation still does
            // both variants.
            result = {
              draftId: await generateDailyContent(
                ctx.user.id,
                undefined,
                undefined,
                undefined,
                false,
              ),
            };
            break;
          case "STRATEGIST": {
            const user = await ctx.db.user.findUnique({
              where: { id: ctx.user.id },
            });
            if (!user) throw new Error("user not found");
            if (!user.businessDescription || !user.goal) {
              throw new Error(
                "Complete onboarding before re-running Strategist",
              );
            }
            const voice = await runStrategist({
              businessDescription: user.businessDescription,
              goal: user.goal,
            });
            await db.agentContext.update({
              where: { userId: ctx.user.id },
              data: {
                strategistOutput: voice as object,
                lastRefreshedAt: new Date(),
              },
            });
            result = { refreshed: true };
            break;
          }
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      await ctx.db.agentContext.update({
        where: { userId: ctx.user.id },
        data: {
          lastManualRun: {
            agent: input.agent,
            at: startedAt.toISOString(),
            durationMs: Date.now() - startedAt.getTime(),
            ok: errorMessage === null,
            error: errorMessage,
          } as object,
        },
      });

      if (errorMessage) {
        throw OrbError.EXTERNAL_API(`${input.agent} run failed: ${errorMessage}`);
      }
      return { agent: input.agent, result };
    }),
});

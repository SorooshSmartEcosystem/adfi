import { z } from "zod";
import { Agent } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { generatePulseSignals } from "../agents/pulse";
import { generateCompetitorIntel } from "../agents/scout";
import { generateDailyContent } from "../agents/echo";
import { runStrategist } from "../agents/strategist";
import { db } from "@orb/db";
import { CREDIT_COSTS, consumeCredits } from "../services/quota";

// Agents users can control directly. Strategist runs at onboarding; Signal
// is event-driven (webhook). Everything else can be paused and manually run.
const ControllableAgent = z.enum(["PULSE", "SCOUT", "ECHO", "STRATEGIST"]);

export const agentRouter = router({
  // Returns paused state + last-run metadata so /specialist/[id] can show
  // correct status + disable run-now while a run is in progress.
  getSettings: authedProc.input(z.void()).query(async ({ ctx }) => {
    const ctxRow = await ctx.db.agentContext.findFirst({
      where: { userId: ctx.user.id },
      select: { pausedAgents: true, lastManualRun: true, lastRefreshedAt: true },
    });
    return {
      pausedAgents: ctxRow?.pausedAgents ?? [],
      lastManualRun: ctxRow?.lastManualRun ?? null,
      lastRefreshedAt: ctxRow?.lastRefreshedAt ?? null,
    };
  }),

  // Used by /specialist/strategist on web + mobile to render the actual
  // brand voice (the artifact) instead of the empty findings list.
  getStrategistVoice: authedProc.input(z.void()).query(async ({ ctx }) => {
    const ctxRow = await ctx.db.agentContext.findFirst({
      where: { userId: ctx.user.id },
      select: { strategistOutput: true, lastRefreshedAt: true },
    });
    return {
      voice: (ctxRow?.strategistOutput as Record<string, unknown> | null) ?? null,
      lastRefreshedAt: ctxRow?.lastRefreshedAt ?? null,
    };
  }),

  // User edits to the brand voice — same shape Strategist outputs, validated
  // here so Echo always sees a well-formed voice.
  updateBrandVoice: authedProc
    .input(
      z.object({
        voiceTone: z.array(z.string().max(80)).min(1).max(8),
        brandValues: z.array(z.string().max(80)).min(1).max(8),
        audienceSegments: z
          .array(
            z.object({
              name: z.string().max(80),
              description: z.string().max(400),
            }),
          )
          .min(1)
          .max(6),
        contentPillars: z.array(z.string().max(120)).min(1).max(8),
        doNotDoList: z.array(z.string().max(200)).min(1).max(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.agentContext.updateMany({
        where: { userId: ctx.user.id },
        data: {
          strategistOutput: input,
          lastRefreshedAt: new Date(),
        },
      });
      return { success: true as const };
    }),

  // Pause/resume are scoped to the active business — a multi-business
  // user pausing Echo on one business shouldn't silence Echo for
  // their other businesses too. Falls back to "all of user's
  // contexts" only when there's no current business set (legacy edge).
  pause: authedProc
    .input(z.object({ agent: ControllableAgent }))
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.currentBusinessId;
      const row = businessId
        ? await ctx.db.agentContext.findUnique({ where: { businessId } })
        : await ctx.db.agentContext.findFirst({
            where: { userId: ctx.user.id },
          });
      if (!row) throw OrbError.NOT_FOUND("agent context");
      const next = Array.from(
        new Set([...(row.pausedAgents ?? []), input.agent as Agent]),
      );
      await ctx.db.agentContext.update({
        where: { id: row.id },
        data: { pausedAgents: next },
      });
      return { pausedAgents: next };
    }),

  resume: authedProc
    .input(z.object({ agent: ControllableAgent }))
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.currentBusinessId;
      const row = businessId
        ? await ctx.db.agentContext.findUnique({ where: { businessId } })
        : await ctx.db.agentContext.findFirst({
            where: { userId: ctx.user.id },
          });
      if (!row) throw OrbError.NOT_FOUND("agent context");
      const next = (row.pausedAgents ?? []).filter((a) => a !== input.agent);
      await ctx.db.agentContext.update({
        where: { id: row.id },
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
            // Per-business strategist run. Reads the ACTIVE
            // business's description (not the user's legacy primary
            // description), writes back to ONLY the active business's
            // AgentContext, and uses the active business's previous
            // voice for refinement. Without this, switching to a
            // farsi business and clicking "run now" would re-run
            // strategist with the english primary description and
            // overwrite every business's voice with the result.
            const businessId = ctx.currentBusinessId;
            if (!businessId) {
              throw new Error(
                "Switch to a business before running Strategist",
              );
            }
            const business = await ctx.db.business.findFirst({
              where: { id: businessId, userId: ctx.user.id },
            });
            if (!business) throw new Error("business not found");
            const user = await ctx.db.user.findUnique({
              where: { id: ctx.user.id },
              select: { goal: true },
            });
            // Prefer the Business.description; fall back to the
            // user's legacy primary if the Business row was created
            // without one (shouldn't happen for new flows).
            const description =
              business.description?.trim() ||
              (
                await ctx.db.user.findUnique({
                  where: { id: ctx.user.id },
                  select: { businessDescription: true },
                })
              )?.businessDescription;
            if (!description) {
              throw new Error(
                "this business has no description — add one before running Strategist",
              );
            }
            const goal = user?.goal ?? "MORE_CUSTOMERS";
            await consumeCredits(
              ctx.user.id,
              CREDIT_COSTS.STRATEGIST_REFRESH,
              "strategist_refresh",
            );
            const existing = await ctx.db.agentContext.findUnique({
              where: { businessId },
              select: { strategistOutput: true },
            });
            const { summarizePerformance } = await import(
              "../services/performance"
            );
            const performance = await summarizePerformance(ctx.user.id, 90);
            const voice = await runStrategist({
              businessDescription: description,
              goal,
              userId: ctx.user.id,
              previousVoice:
                (existing?.strategistOutput as
                  | Awaited<ReturnType<typeof runStrategist>>
                  | null) ?? null,
              performance,
            });
            await db.agentContext.upsert({
              where: { businessId },
              update: {
                strategistOutput: voice as object,
                lastRefreshedAt: new Date(),
              },
              create: {
                userId: ctx.user.id,
                businessId,
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

      // Record lastManualRun on the active business's AgentContext
      // only — not all of the user's businesses. The "last run at"
      // status the specialist UI shows should reflect the business
      // the user just clicked from, not bleed across businesses.
      if (ctx.currentBusinessId) {
        await ctx.db.agentContext.updateMany({
          where: { businessId: ctx.currentBusinessId },
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
      }

      if (errorMessage) {
        throw OrbError.EXTERNAL_API(`${input.agent} run failed: ${errorMessage}`);
      }
      return { agent: input.agent, result };
    }),
});

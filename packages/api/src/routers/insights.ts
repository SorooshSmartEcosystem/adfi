import { z } from "zod";
import { Agent, Direction, FindingSeverity } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

const DAY_MS = 24 * 60 * 60 * 1000;

export const insightsRouter = router({
  listFindings: authedProc
    .input(
      z.object({
        severity: z.nativeEnum(FindingSeverity).optional(),
        acknowledged: z.boolean().optional(),
        agent: z.nativeEnum(Agent).optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.finding.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.severity && { severity: input.severity }),
          ...(input.acknowledged !== undefined && {
            acknowledged: input.acknowledged,
          }),
          ...(input.agent && { agent: input.agent }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  acknowledgeFinding: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const finding = await ctx.db.finding.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!finding) throw OrbError.NOT_FOUND("finding");
      return ctx.db.finding.update({
        where: { id: finding.id },
        data: { acknowledged: true, acknowledgedAt: new Date() },
      });
    }),

  getWeeklyReport: authedProc
    .input(z.object({ weekOf: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const end = input.weekOf ?? new Date();
      const start = new Date(end.getTime() - 7 * DAY_MS);

      const [posts, messages, calls, appointments] = await Promise.all([
        ctx.db.contentPost.findMany({
          where: {
            userId: ctx.user.id,
            publishedAt: { gte: start, lte: end },
          },
          select: { metrics: true },
        }),
        ctx.db.message.count({
          where: {
            userId: ctx.user.id,
            direction: Direction.INBOUND,
            createdAt: { gte: start, lte: end },
          },
        }),
        ctx.db.call.count({
          where: { userId: ctx.user.id, startedAt: { gte: start, lte: end } },
        }),
        ctx.db.appointment.count({
          where: {
            userId: ctx.user.id,
            createdAt: { gte: start, lte: end },
          },
        }),
      ]);

      const reach = posts.reduce((sum, p) => {
        const m = p.metrics as { reach?: number } | null;
        return sum + (m?.reach ?? 0);
      }, 0);

      return {
        weekStart: start,
        weekEnd: end,
        postsPublished: posts.length,
        reach,
        messagesInbound: messages,
        callsHandled: calls,
        appointmentsBooked: appointments,
      };
    }),

  // Needs a pattern-detection engine (trend analysis over agent_events + posts).
  // Stub until Pulse/Strategist produce the signals.
  getPerformancePatterns: authedProc.input(z.void()).query(() => {
    return [] as const;
  }),
});

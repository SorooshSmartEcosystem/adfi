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
      // Scope by the active business so STUDIO/AGENCY users see only
      // findings for the business they're currently looking at. Falls
      // back to userId for legacy rows that haven't been backfilled
      // with businessId.
      const businessId = ctx.currentBusinessId;
      const scope = businessId
        ? {
            OR: [
              { businessId },
              { businessId: null, userId: ctx.user.id },
            ],
          }
        : { userId: ctx.user.id };
      return ctx.db.finding.findMany({
        where: {
          ...scope,
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

      const priorStart = new Date(start.getTime() - 7 * DAY_MS);
      const [
        posts,
        priorPosts,
        messages,
        calls,
        appointments,
        findings,
      ] = await Promise.all([
        ctx.db.contentPost.findMany({
          where: {
            userId: ctx.user.id,
            publishedAt: { gte: start, lte: end },
          },
          select: { metrics: true },
        }),
        ctx.db.contentPost.findMany({
          where: {
            userId: ctx.user.id,
            publishedAt: { gte: priorStart, lt: start },
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
        ctx.db.appointment.findMany({
          where: {
            userId: ctx.user.id,
            createdAt: { gte: start, lte: end },
          },
          select: { estimatedValueCents: true },
        }),
        ctx.db.finding.findMany({
          where: { userId: ctx.user.id, createdAt: { gte: start, lte: end } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      const sumReach = (ps: { metrics: unknown }[]) =>
        ps.reduce((sum, p) => {
          const m = p.metrics as { reach?: number } | null;
          return sum + (m?.reach ?? 0);
        }, 0);

      const reach = sumReach(posts);
      const reachPrior = sumReach(priorPosts);
      const reachDeltaPct =
        reachPrior > 0
          ? Math.round(((reach - reachPrior) / reachPrior) * 100)
          : null;

      const revenueImpactCents = appointments.reduce(
        (sum, a) => sum + (a.estimatedValueCents ?? 0),
        0,
      );

      return {
        weekStart: start,
        weekEnd: end,
        postsPublished: posts.length,
        reach,
        reachDeltaPct,
        messagesInbound: messages,
        callsHandled: calls,
        appointmentsBooked: appointments.length,
        revenueImpactCents,
        findings,
      };
    }),

  // Needs a pattern-detection engine (trend analysis over agent_events + posts).
  // Stub until Pulse/Strategist produce the signals.
  getPerformancePatterns: authedProc.input(z.void()).query(() => {
    return [] as const;
  }),
});

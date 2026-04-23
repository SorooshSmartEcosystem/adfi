import { z } from "zod";
import { Agent } from "@orb/db";
import { router, adminProc } from "../trpc";
import { OrbError } from "../errors";

export const adminRouter = router({
  listUsers: adminProc
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().uuid().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: input.search
          ? {
              OR: [
                { email: { contains: input.search, mode: "insensitive" } },
                { phone: { contains: input.search } },
              ],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });
      let nextCursor: string | null = null;
      if (users.length > input.limit) {
        const next = users.pop();
        nextCursor = next?.id ?? null;
      }
      return { items: users, nextCursor };
    }),

  getUser: adminProc
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
          subscriptions: true,
          phoneNumbers: true,
          agentContext: true,
        },
      });
      if (!user) throw OrbError.NOT_FOUND("user");
      return user;
    }),

  suspendUser: adminProc
    .input(z.object({ id: z.string().uuid(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Using deletedAt as a suspension marker for v1; a proper "suspended"
      // state with audit trail lands with moderation tooling.
      return ctx.db.user.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  listAgentRuns: adminProc
    .input(
      z.object({
        agent: z.nativeEnum(Agent).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.agentEvent.findMany({
        where: input.agent ? { agent: input.agent } : undefined,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });
      let nextCursor: string | null = null;
      if (events.length > input.limit) {
        const next = events.pop();
        nextCursor = next?.id ?? null;
      }
      return { items: events, nextCursor };
    }),

  getAgentRun: adminProc
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.agentEvent.findUnique({
        where: { id: input.id },
      });
      if (!event) throw OrbError.NOT_FOUND("agent run");
      return event;
    }),

  // Moderation tooling (flag, approve, reject) isn't schema-backed yet.
  // Stubs keep the admin router surface complete; real impl lands when we
  // add a `flagged_content` table.
  listFlaggedContent: adminProc
    .input(z.object({ reviewed: z.boolean().optional() }))
    .query(() => {
      return [] as const;
    }),

  approveFlagged: adminProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(() => {
      throw OrbError.VALIDATION("Moderation tooling not yet live");
    }),

  rejectFlagged: adminProc
    .input(z.object({ id: z.string().uuid(), reason: z.string() }))
    .mutation(() => {
      throw OrbError.VALIDATION("Moderation tooling not yet live");
    }),

  getSystemHealth: adminProc.input(z.void()).query(async ({ ctx }) => {
    const [users, subscriptions, calls, posts] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.subscription.count({
        where: { status: { in: ["TRIALING", "ACTIVE"] } },
      }),
      ctx.db.call.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      ctx.db.contentPost.count({
        where: {
          publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return {
      totalUsers: users,
      activeSubscriptions: subscriptions,
      callsLast24h: calls,
      postsLast24h: posts,
      ts: new Date().toISOString(),
    };
  }),
});

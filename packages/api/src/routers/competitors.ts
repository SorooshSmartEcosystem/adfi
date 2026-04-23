import { z } from "zod";
import { Platform } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

export const competitorsRouter = router({
  list: authedProc.input(z.void()).query(async ({ ctx }) => {
    return ctx.db.competitor.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  add: authedProc
    .input(
      z.object({
        name: z.string().min(1).max(100),
        handle: z.string().max(100).optional(),
        platform: z.nativeEnum(Platform),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.competitor.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          handle: input.handle,
          platform: input.platform,
        },
      });
    }),

  remove: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const competitor = await ctx.db.competitor.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!competitor) throw OrbError.NOT_FOUND("competitor");
      await ctx.db.competitor.delete({ where: { id: competitor.id } });
      return { success: true as const };
    }),

  getRecentActivity: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const competitor = await ctx.db.competitor.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { recentActivity: true, lastCheckedAt: true },
      });
      if (!competitor) throw OrbError.NOT_FOUND("competitor");
      return {
        activity: competitor.recentActivity ?? [],
        lastCheckedAt: competitor.lastCheckedAt,
      };
    }),
});

import { z } from "zod";
import { Goal } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

const DAY_MS = 24 * 60 * 60 * 1000;

export const userRouter = router({
  me: authedProc.input(z.void()).query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.user.id } });
    if (!user) throw OrbError.NOT_FOUND("user");
    return user;
  }),

  updateProfile: authedProc
    .input(
      z.object({
        businessDescription: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.businessDescription !== undefined && {
            businessDescription: input.businessDescription,
          }),
        },
      });
      return user;
    }),

  updateGoal: authedProc
    .input(z.object({ goal: z.nativeEnum(Goal) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { goal: input.goal },
      });
      return user;
    }),

  getHomeData: authedProc.input(z.void()).query(async ({ ctx }) => {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * DAY_MS);

    const [user, postsLast7, messagesLast7, pendingFinding, phoneNumber] =
      await Promise.all([
        ctx.db.user.findUnique({ where: { id: ctx.user.id } }),
        ctx.db.contentPost.findMany({
          where: {
            userId: ctx.user.id,
            publishedAt: { gte: sevenDaysAgo },
          },
          select: { metrics: true },
        }),
        ctx.db.message.count({
          where: {
            userId: ctx.user.id,
            direction: "INBOUND",
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        ctx.db.finding.findFirst({
          where: { userId: ctx.user.id, acknowledged: false },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.phoneNumber.findFirst({
          where: { userId: ctx.user.id, status: "ACTIVE" },
        }),
      ]);

    if (!user) throw OrbError.NOT_FOUND("user");

    const onboardedMs = user.onboardedAt?.getTime() ?? now;
    const daysSinceOnboard = (now - onboardedMs) / DAY_MS;
    const dayState: "day1" | "day3" | "steady" =
      daysSinceOnboard < 1 ? "day1" : daysSinceOnboard < 3 ? "day3" : "steady";

    const reach = postsLast7.reduce((sum, post) => {
      const m = post.metrics as { reach?: number } | null;
      return sum + (m?.reach ?? 0);
    }, 0);

    const trialDaysLeft = user.trialEndsAt
      ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - now) / DAY_MS))
      : null;

    return {
      dayState,
      weeklyStats: {
        postsCount: postsLast7.length,
        reach,
        messagesHandled: messagesLast7,
      },
      pendingFinding,
      phoneStatus: phoneNumber
        ? { number: phoneNumber.number, active: true }
        : { number: "", active: false },
      trialDaysLeft,
    };
  }),

  deleteAccount: authedProc
    .input(z.object({ confirmPhrase: z.literal("delete my account") }))
    .mutation(async ({ ctx }) => {
      const scheduledFor = new Date(Date.now() + 7 * DAY_MS);
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { deletedAt: scheduledFor },
      });
      return { scheduledFor };
    }),
});

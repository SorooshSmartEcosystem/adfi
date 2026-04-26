import { z } from "zod";
import { Goal } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

const DAY_MS = 24 * 60 * 60 * 1000;

export const userRouter = router({
  me: authedProc.input(z.void()).query(async ({ ctx }) => {
    // Self-healing: if a User row doesn't exist yet for this supabase auth
    // user (legacy account, missing trigger, etc.) create one from the
    // session email. Avoids 500ing the dashboard for valid sessions.
    const existing = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
    });
    if (existing) return existing;
    const created = await ctx.db.user.create({
      data: {
        id: ctx.user.id,
        email: ctx.user.email ?? `${ctx.user.id}@no-email.adfi`,
      },
    });
    return created;
  }),

  updateProfile: authedProc
    .input(
      z.object({
        businessName: z.string().max(80).optional(),
        businessDescription: z.string().max(500).optional(),
        businessLogoUrl: z.string().url().max(500).nullable().optional(),
        // Accept bare domains too — auto-prefix https:// before validating.
        businessWebsiteUrl: z
          .string()
          .max(500)
          .nullable()
          .optional()
          .transform((v) => {
            if (!v) return v;
            const trimmed = v.trim();
            if (!trimmed) return null;
            return /^https?:\/\//i.test(trimmed)
              ? trimmed
              : `https://${trimmed}`;
          })
          .pipe(
            z
              .string()
              .url()
              .max(500)
              .nullable()
              .optional(),
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.businessName !== undefined && {
            businessName: input.businessName,
          }),
          ...(input.businessDescription !== undefined && {
            businessDescription: input.businessDescription,
          }),
          ...(input.businessLogoUrl !== undefined && {
            businessLogoUrl: input.businessLogoUrl,
          }),
          ...(input.businessWebsiteUrl !== undefined && {
            businessWebsiteUrl: input.businessWebsiteUrl,
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
    const fourteenDaysAgo = new Date(now - 14 * DAY_MS);

    const [
      user,
      postsLast7,
      postsPriorWeek,
      messagesLast7,
      callsLast7,
      appointmentsLast7,
      pendingFinding,
      unreadMessages,
      draftPosts,
      phoneNumber,
    ] = await Promise.all([
      ctx.db.user.findUnique({ where: { id: ctx.user.id } }),
      ctx.db.contentPost.findMany({
        where: {
          userId: ctx.user.id,
          publishedAt: { gte: sevenDaysAgo },
        },
        select: { metrics: true },
      }),
      ctx.db.contentPost.findMany({
        where: {
          userId: ctx.user.id,
          publishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
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
      ctx.db.call.count({
        where: { userId: ctx.user.id, startedAt: { gte: sevenDaysAgo } },
      }),
      ctx.db.appointment.count({
        where: { userId: ctx.user.id, createdAt: { gte: sevenDaysAgo } },
      }),
      ctx.db.finding.findFirst({
        where: { userId: ctx.user.id, acknowledged: false },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.message.count({
        where: {
          userId: ctx.user.id,
          direction: "INBOUND",
          handledBy: null,
        },
      }),
      ctx.db.contentDraft.count({
        where: {
          userId: ctx.user.id,
          status: { in: ["DRAFT", "AWAITING_PHOTOS", "AWAITING_REVIEW"] },
        },
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

    const sumReach = (posts: { metrics: unknown }[]) =>
      posts.reduce((sum, post) => {
        const m = post.metrics as { reach?: number } | null;
        return sum + (m?.reach ?? 0);
      }, 0);

    const reach = sumReach(postsLast7);
    const reachPrior = sumReach(postsPriorWeek);
    const reachDeltaPct =
      reachPrior > 0 ? Math.round(((reach - reachPrior) / reachPrior) * 100) : null;

    const trialDaysLeft = user.trialEndsAt
      ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - now) / DAY_MS))
      : null;

    return {
      dayState,
      weeklyStats: {
        postsCount: postsLast7.length,
        reach,
        reachDeltaPct,
        messagesHandled: messagesLast7,
        callsHandled: callsLast7,
        appointmentsBooked: appointmentsLast7,
      },
      navBadges: {
        inbox: unreadMessages,
        content: draftPosts,
      },
      pendingFinding,
      phoneStatus: phoneNumber
        ? { number: phoneNumber.number, active: true }
        : { number: "", active: false },
      trialDaysLeft,
    };
  }),

  // Daily reach rollups for the dashboard charts. We don't have a daily
  // metrics table yet, so we aggregate ContentPost.publishedAt + metrics.reach
  // into per-day buckets at request time. Cheap for the volumes we'll see in
  // year one (small N of posts per user); revisit when a single user has
  // thousands of posts.
  getReachTimeseries: authedProc
    .input(
      z.object({
        rangeDays: z.number().min(7).max(400).default(28),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = Date.now();
      const start = new Date(now - input.rangeDays * DAY_MS);
      start.setUTCHours(0, 0, 0, 0);

      const posts = await ctx.db.contentPost.findMany({
        where: {
          userId: ctx.user.id,
          publishedAt: { gte: start },
        },
        select: { publishedAt: true, metrics: true },
      });

      const byDay = new Map<string, number>();
      for (const p of posts) {
        const key = p.publishedAt.toISOString().slice(0, 10);
        const m = p.metrics as { reach?: number } | null;
        const reach = m?.reach ?? 0;
        byDay.set(key, (byDay.get(key) ?? 0) + reach);
      }

      const days: { day: string; reach: number }[] = [];
      for (let i = 0; i < input.rangeDays; i++) {
        const d = new Date(start.getTime() + i * DAY_MS);
        const key = d.toISOString().slice(0, 10);
        days.push({ day: key, reach: byDay.get(key) ?? 0 });
      }
      return days;
    }),

  getRecentActivity: authedProc
    .input(z.object({ limit: z.number().min(1).max(20).default(6) }))
    .query(async ({ ctx, input }) => {
      const [findings, posts, calls] = await Promise.all([
        ctx.db.finding.findMany({
          where: { userId: ctx.user.id },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        }),
        ctx.db.contentPost.findMany({
          where: { userId: ctx.user.id },
          orderBy: { publishedAt: "desc" },
          take: input.limit,
        }),
        ctx.db.call.findMany({
          where: { userId: ctx.user.id },
          orderBy: { startedAt: "desc" },
          take: input.limit,
        }),
      ]);

      type Item = {
        id: string;
        agent: string;
        at: Date;
        title: string;
        desc: string;
        value?: string;
      };

      const items: Item[] = [
        ...findings.map((f) => ({
          id: `f-${f.id}`,
          agent: f.agent,
          at: f.createdAt,
          title: f.summary,
          desc: "",
        })),
        ...posts.map((p) => {
          const m = (p.metrics ?? {}) as { reach?: number };
          return {
            id: `p-${p.id}`,
            agent: "ECHO",
            at: p.publishedAt,
            title: `i posted on ${p.platform.toLowerCase()}`,
            desc: "",
            value: m.reach ? `${m.reach.toLocaleString()} reach` : undefined,
          };
        }),
        ...calls.map((c) => {
          const cents = c.estimatedValueCents ?? 0;
          return {
            id: `c-${c.id}`,
            agent: "SIGNAL",
            at: c.startedAt,
            title:
              c.recoveredStatus === "MISSED_AND_RECOVERED"
                ? "i caught a missed call"
                : "i handled a call",
            desc: "",
            value: cents ? `$${Math.round(cents / 100)} est.` : undefined,
          };
        }),
      ];

      return items
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, input.limit);
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

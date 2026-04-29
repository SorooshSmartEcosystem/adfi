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

    // Per-business scope: every per-business table filters by the
    // active business. Legacy rows pre-multi-business migration may
    // still have null businessId; they fall back to the userId match
    // so they don't disappear from the user's history.
    const businessId = ctx.currentBusinessId;
    const scope = businessId
      ? {
          OR: [
            { businessId },
            { businessId: null, userId: ctx.user.id },
          ],
        }
      : { userId: ctx.user.id };

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
          ...scope,
          publishedAt: { gte: sevenDaysAgo },
        },
        select: { metrics: true },
      }),
      ctx.db.contentPost.findMany({
        where: {
          ...scope,
          publishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        select: { metrics: true },
      }),
      ctx.db.message.count({
        where: {
          ...scope,
          direction: "INBOUND",
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      ctx.db.call.count({
        where: { ...scope, startedAt: { gte: sevenDaysAgo } },
      }),
      ctx.db.appointment.findMany({
        where: { ...scope, createdAt: { gte: sevenDaysAgo } },
        select: { estimatedValueCents: true },
      }),
      ctx.db.finding.findFirst({
        where: { ...scope, acknowledged: false },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.message.count({
        where: {
          ...scope,
          direction: "INBOUND",
          handledBy: null,
        },
      }),
      ctx.db.contentDraft.count({
        where: {
          ...scope,
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
        appointmentsBooked: appointmentsLast7.length,
        appointmentValueCents: appointmentsLast7.reduce(
          (s, a) => s + (a.estimatedValueCents ?? 0),
          0,
        ),
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

      const businessId = ctx.currentBusinessId;
      const posts = await ctx.db.contentPost.findMany({
        where: {
          ...(businessId
            ? {
                OR: [
                  { businessId },
                  { businessId: null, userId: ctx.user.id },
                ],
              }
            : { userId: ctx.user.id }),
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

  // Computes top-lift content categories vs the user's own baseline so the
  // dashboard can show "process videos +85% vs avg". Pillar metadata comes
  // from the draft's brief; format from the post itself. Returns at most
  // five rows, sorted by lift descending. Empty when fewer than 3 posts.
  getWhatsWorking: authedProc.input(z.void()).query(async ({ ctx }) => {
    const since = new Date(Date.now() - 30 * DAY_MS);
    const businessId = ctx.currentBusinessId;
    const posts = await ctx.db.contentPost.findMany({
      where: {
        ...(businessId
          ? {
              OR: [
                { businessId },
                { businessId: null, userId: ctx.user.id },
              ],
            }
          : { userId: ctx.user.id }),
        publishedAt: { gte: since },
      },
      select: {
        platform: true,
        metrics: true,
        draft: { select: { format: true, brief: true } },
      },
    });
    if (posts.length < 3) return { items: [] as { label: string; lift: number; count: number }[] };

    const totalReach = posts.reduce((s, p) => {
      const m = p.metrics as { reach?: number } | null;
      return s + (m?.reach ?? 0);
    }, 0);
    const baseline = totalReach / posts.length;
    if (baseline <= 0) return { items: [] };

    type Row = { reachSum: number; count: number };
    const groups = new Map<string, Row>();
    function bump(label: string, reach: number) {
      const r = groups.get(label) ?? { reachSum: 0, count: 0 };
      r.reachSum += reach;
      r.count += 1;
      groups.set(label, r);
    }

    for (const p of posts) {
      const m = p.metrics as { reach?: number } | null;
      const reach = m?.reach ?? 0;
      const fmt = p.draft.format
        .toLowerCase()
        .replace(/_/g, " ");
      bump(fmt, reach);
      const brief = p.draft.brief as { pillar?: string } | null;
      if (brief?.pillar) bump(brief.pillar, reach);
    }

    const items = Array.from(groups.entries())
      .filter(([, r]) => r.count >= 2)
      .map(([label, r]) => ({
        label,
        count: r.count,
        avg: r.reachSum / r.count,
      }))
      .map(({ label, count, avg }) => ({
        label,
        count,
        lift: Math.round(((avg - baseline) / baseline) * 100),
      }))
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 5);

    return { items };
  }),

  getRecentActivity: authedProc
    .input(z.object({ limit: z.number().min(1).max(20).default(6) }))
    .query(async ({ ctx, input }) => {
      const businessId = ctx.currentBusinessId;
      const scope = businessId
        ? {
            OR: [
              { businessId },
              { businessId: null, userId: ctx.user.id },
            ],
          }
        : { userId: ctx.user.id };
      const [findings, posts, calls] = await Promise.all([
        ctx.db.finding.findMany({
          where: scope,
          orderBy: { createdAt: "desc" },
          take: input.limit,
        }),
        ctx.db.contentPost.findMany({
          where: scope,
          orderBy: { publishedAt: "desc" },
          take: input.limit,
        }),
        ctx.db.call.findMany({
          where: scope,
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

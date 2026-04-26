import { z } from "zod";
import { Agent } from "@orb/db";
import { router, adminProc } from "../trpc";
import { OrbError } from "../errors";
import {
  AVG_EVENT_COST_CENTS,
  estimateEventCostCents,
  FIXED_OVERHEAD_CENTS,
  PLAN_PRICING_CENTS,
  TWILIO_CENTS,
} from "../services/pricing";

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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

  financialsOverview: adminProc.input(z.void()).query(async ({ ctx }) => {
    const periodStart = startOfMonth();
    const now = new Date();

    // Users + subscriptions
    const [totalUsers, trialCount, activeCount, pastDueCount, canceledCount] =
      await Promise.all([
        ctx.db.user.count({ where: { deletedAt: null } }),
        ctx.db.subscription.count({ where: { status: "TRIALING" } }),
        ctx.db.subscription.count({ where: { status: "ACTIVE" } }),
        ctx.db.subscription.count({ where: { status: "PAST_DUE" } }),
        ctx.db.subscription.count({ where: { status: "CANCELED" } }),
      ]);

    const activeSubs = await ctx.db.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: true },
    });
    const mrrCents = activeSubs.reduce(
      (sum, s) => sum + PLAN_PRICING_CENTS[s.plan],
      0,
    );

    // Anthropic cost — per-event estimates this month
    const events = await ctx.db.agentEvent.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { eventType: true, agent: true, payload: true },
    });
    let anthropicCents = 0;
    let replicateCents = 0;
    let imagesGenerated = 0;
    for (const e of events) {
      const c = estimateEventCostCents(e.eventType, e.agent, e.payload);
      if (e.eventType === "image_generated") {
        replicateCents += c;
        const p = e.payload as { imagesGenerated?: number } | null;
        imagesGenerated += p?.imagesGenerated ?? 1;
      } else {
        anthropicCents += c;
      }
    }

    // Twilio cost — active numbers × monthly + outbound SMS × per-message
    const activeNumbers = await ctx.db.phoneNumber.count({
      where: { status: "ACTIVE" },
    });
    const outboundSms = await ctx.db.message.count({
      where: {
        direction: "OUTBOUND",
        channel: "SMS",
        createdAt: { gte: periodStart },
      },
    });
    const twilioNumbersCents = activeNumbers * TWILIO_CENTS.localNumberMonthly;
    const twilioSmsCents = Math.round(outboundSms * TWILIO_CENTS.outboundSms);
    const twilioCents = twilioNumbersCents + twilioSmsCents;

    const fixedCents =
      FIXED_OVERHEAD_CENTS.vercel +
      FIXED_OVERHEAD_CENTS.supabase +
      FIXED_OVERHEAD_CENTS.anthropicTeam;

    const variableCostCents = anthropicCents + replicateCents + twilioCents;
    const totalCostCents = variableCostCents + fixedCents;
    const grossMarginCents = mrrCents - variableCostCents;
    const grossMarginPct =
      mrrCents > 0 ? (grossMarginCents / mrrCents) * 100 : 0;

    return {
      period: { start: periodStart.toISOString(), end: now.toISOString() },
      users: {
        total: totalUsers,
        trialing: trialCount,
        active: activeCount,
        pastDue: pastDueCount,
        canceled: canceledCount,
      },
      revenue: { mrrCents },
      costs: {
        anthropicCents,
        replicateCents,
        replicateBreakdown: { imagesGenerated },
        twilioCents,
        twilioBreakdown: {
          numbersCents: twilioNumbersCents,
          smsCents: twilioSmsCents,
          activeNumbers,
          outboundSmsCount: outboundSms,
        },
        fixedCents,
        fixedBreakdown: FIXED_OVERHEAD_CENTS,
        variableCents: variableCostCents,
        totalCents: totalCostCents,
      },
      margin: {
        grossCents: grossMarginCents,
        grossPct: grossMarginPct,
      },
      eventCounts: {
        strategist: events.filter((e) => e.agent === "STRATEGIST").length,
        echoDrafts: events.filter(
          (e) => e.agent === "ECHO" && e.eventType === "draft_created",
        ).length,
        echoRegens: events.filter(
          (e) => e.agent === "ECHO" && e.eventType === "draft_regenerated",
        ).length,
        scoutSweeps: events.filter((e) => e.agent === "SCOUT").length,
        pulseSweeps: events.filter((e) => e.agent === "PULSE").length,
        signalSms: events.filter(
          (e) => e.agent === "SIGNAL" && e.eventType === "sms_handled",
        ).length,
        imagesGenerated,
      },
    };
  }),

  financialsPerUser: adminProc
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const periodStart = startOfMonth();

      // Fetch events + aggregate per user
      const events = await ctx.db.agentEvent.findMany({
        where: { createdAt: { gte: periodStart } },
        select: { userId: true, eventType: true, agent: true, payload: true },
      });
      const costByUser = new Map<string, number>();
      const eventsByUser = new Map<string, number>();
      for (const e of events) {
        const c = estimateEventCostCents(e.eventType, e.agent, e.payload);
        costByUser.set(e.userId, (costByUser.get(e.userId) ?? 0) + c);
        eventsByUser.set(e.userId, (eventsByUser.get(e.userId) ?? 0) + 1);
      }

      // Add Twilio costs per user
      const userIdsWithEvents = Array.from(costByUser.keys());
      const phoneCounts = await ctx.db.phoneNumber.groupBy({
        by: ["userId"],
        where: { status: "ACTIVE" },
        _count: true,
      });
      const smsCounts = await ctx.db.message.groupBy({
        by: ["userId"],
        where: {
          direction: "OUTBOUND",
          channel: "SMS",
          createdAt: { gte: periodStart },
        },
        _count: true,
      });
      const phoneByUser = new Map(phoneCounts.map((p) => [p.userId, p._count]));
      const smsByUser = new Map(smsCounts.map((s) => [s.userId, s._count]));

      // Combine candidate user set from events + phone + sms
      const allUserIds = new Set([
        ...userIdsWithEvents,
        ...phoneCounts.map((p) => p.userId),
        ...smsCounts.map((s) => s.userId),
      ]);

      const userDetails = await ctx.db.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: {
          id: true,
          email: true,
          phone: true,
          onboardedAt: true,
          trialEndsAt: true,
          createdAt: true,
          subscriptions: {
            where: { status: { in: ["TRIALING", "ACTIVE"] } },
            select: { plan: true, status: true },
            take: 1,
          },
        },
      });

      const rows = Array.from(allUserIds).map((userId) => {
        const u = userDetails.find((x) => x.id === userId);
        const sub = u?.subscriptions[0];
        const revenue =
          sub?.status === "ACTIVE" ? PLAN_PRICING_CENTS[sub.plan] : 0;
        const anthropic = costByUser.get(userId) ?? 0;
        const numbers = phoneByUser.get(userId) ?? 0;
        const sms = smsByUser.get(userId) ?? 0;
        const twilio =
          numbers * TWILIO_CENTS.localNumberMonthly +
          Math.round(sms * TWILIO_CENTS.outboundSms);
        const cost = anthropic + twilio;
        return {
          userId,
          email: u?.email ?? null,
          phone: u?.phone ?? null,
          createdAt: u?.createdAt ?? null,
          onboardedAt: u?.onboardedAt ?? null,
          trialEndsAt: u?.trialEndsAt ?? null,
          plan: sub?.plan ?? null,
          status: sub?.status ?? null,
          eventCount: eventsByUser.get(userId) ?? 0,
          anthropicCents: anthropic,
          twilioCents: twilio,
          totalCostCents: cost,
          revenueCents: revenue,
          marginCents: revenue - cost,
        };
      });

      // Sort: paying users first by margin, then trial/unpaid by cost desc
      rows.sort((a, b) => {
        if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
        if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
        return b.totalCostCents - a.totalCostCents;
      });

      return rows.slice(0, input.limit);
    }),

  financialsUserDetail: adminProc
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const periodStart = startOfMonth();

      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          subscriptions: {
            where: { status: { in: ["TRIALING", "ACTIVE"] } },
          },
          phoneNumbers: { where: { status: "ACTIVE" } },
        },
      });
      if (!user) throw OrbError.NOT_FOUND("user");

      const events = await ctx.db.agentEvent.findMany({
        where: { userId: input.userId, createdAt: { gte: periodStart } },
        orderBy: { createdAt: "desc" },
      });

      type Row = { agent: string; eventType: string; count: number; costCents: number };
      const summary = new Map<string, Row>();
      for (const e of events) {
        const key = `${e.agent}:${e.eventType}`;
        const prev = summary.get(key) ?? {
          agent: e.agent,
          eventType: e.eventType,
          count: 0,
          costCents: 0,
        };
        prev.count += 1;
        prev.costCents += estimateEventCostCents(e.eventType, e.agent, e.payload);
        summary.set(key, prev);
      }

      const smsOut = await ctx.db.message.count({
        where: {
          userId: input.userId,
          direction: "OUTBOUND",
          channel: "SMS",
          createdAt: { gte: periodStart },
        },
      });

      let anthropicCents = 0;
      let replicateCents = 0;
      let imagesGenerated = 0;
      for (const v of summary.values()) {
        if (v.eventType === "image_generated") {
          replicateCents += v.costCents;
          imagesGenerated += v.count;
        } else {
          anthropicCents += v.costCents;
        }
      }
      const twilioNumbersCents =
        user.phoneNumbers.length * TWILIO_CENTS.localNumberMonthly;
      const twilioSmsCents = Math.round(smsOut * TWILIO_CENTS.outboundSms);
      const sub = user.subscriptions[0];
      const revenueCents =
        sub?.status === "ACTIVE" ? PLAN_PRICING_CENTS[sub.plan] : 0;
      const totalCostCents =
        anthropicCents + replicateCents + twilioNumbersCents + twilioSmsCents;

      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          businessDescription: user.businessDescription,
          createdAt: user.createdAt,
          onboardedAt: user.onboardedAt,
          trialEndsAt: user.trialEndsAt,
        },
        subscription: sub
          ? {
              plan: sub.plan,
              status: sub.status,
              currentPeriodEnd: sub.currentPeriodEnd,
            }
          : null,
        revenueCents,
        costs: {
          anthropicCents,
          replicateCents,
          twilioNumbersCents,
          twilioSmsCents,
          totalCostCents,
        },
        margin: {
          cents: revenueCents - totalCostCents,
        },
        activity: {
          activeNumbers: user.phoneNumbers.length,
          outboundSmsCount: smsOut,
          totalEvents: events.length,
          imagesGenerated,
        },
        byEvent: Array.from(summary.values()).sort(
          (a, b) => b.costCents - a.costCents,
        ),
      };
    }),

  financialsPerService: adminProc.input(z.void()).query(async ({ ctx }) => {
    const periodStart = startOfMonth();

    const events = await ctx.db.agentEvent.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { eventType: true, agent: true, payload: true },
    });
    const agentBreakdown = {
      STRATEGIST: 0,
      ECHO: 0,
      SCOUT: 0,
      PULSE: 0,
      SIGNAL: 0,
      ADS: 0,
    };
    let replicateCents = 0;
    let imagesGenerated = 0;
    for (const e of events) {
      const c = estimateEventCostCents(e.eventType, e.agent, e.payload);
      if (e.eventType === "image_generated") {
        replicateCents += c;
        const p = e.payload as { imagesGenerated?: number } | null;
        imagesGenerated += p?.imagesGenerated ?? 1;
      } else {
        agentBreakdown[e.agent as keyof typeof agentBreakdown] += c;
      }
    }

    const activeNumbers = await ctx.db.phoneNumber.count({
      where: { status: "ACTIVE" },
    });
    const outboundSms = await ctx.db.message.count({
      where: {
        direction: "OUTBOUND",
        channel: "SMS",
        createdAt: { gte: periodStart },
      },
    });

    return {
      period: { start: periodStart.toISOString(), end: new Date().toISOString() },
      services: [
        {
          name: "Anthropic (Strategist)",
          costCents: agentBreakdown.STRATEGIST,
          unit: "runs",
          count: events.filter((e) => e.agent === "STRATEGIST").length,
          unitCostCents: AVG_EVENT_COST_CENTS.STRATEGIST,
        },
        {
          name: "Anthropic (Echo)",
          costCents: agentBreakdown.ECHO,
          unit: "drafts",
          count: events.filter(
            (e) => e.agent === "ECHO" && e.eventType !== "image_generated",
          ).length,
          unitCostCents: AVG_EVENT_COST_CENTS.ECHO_DRAFT,
        },
        {
          name: "Anthropic (Scout)",
          costCents: agentBreakdown.SCOUT,
          unit: "sweeps",
          count: events.filter((e) => e.agent === "SCOUT").length,
          unitCostCents: AVG_EVENT_COST_CENTS.SCOUT_SWEEP,
        },
        {
          name: "Anthropic (Pulse)",
          costCents: agentBreakdown.PULSE,
          unit: "sweeps",
          count: events.filter((e) => e.agent === "PULSE").length,
          unitCostCents: AVG_EVENT_COST_CENTS.PULSE_SWEEP,
        },
        {
          name: "Anthropic (Signal)",
          costCents: agentBreakdown.SIGNAL,
          unit: "replies",
          count: events.filter((e) => e.agent === "SIGNAL").length,
          unitCostCents: AVG_EVENT_COST_CENTS.SIGNAL_SMS,
        },
        {
          name: "Replicate (Echo images)",
          costCents: replicateCents,
          unit: "images",
          count: imagesGenerated,
          unitCostCents: imagesGenerated > 0
            ? Math.round(replicateCents / imagesGenerated)
            : 1,
        },
        {
          name: "Twilio — phone numbers",
          costCents: activeNumbers * TWILIO_CENTS.localNumberMonthly,
          unit: "numbers",
          count: activeNumbers,
          unitCostCents: TWILIO_CENTS.localNumberMonthly,
        },
        {
          name: "Twilio — SMS (outbound)",
          costCents: Math.round(outboundSms * TWILIO_CENTS.outboundSms),
          unit: "messages",
          count: outboundSms,
          unitCostCents: TWILIO_CENTS.outboundSms,
        },
        {
          name: "Vercel (fixed)",
          costCents: FIXED_OVERHEAD_CENTS.vercel,
          unit: "monthly",
          count: 1,
          unitCostCents: FIXED_OVERHEAD_CENTS.vercel,
        },
        {
          name: "Supabase (fixed)",
          costCents: FIXED_OVERHEAD_CENTS.supabase,
          unit: "monthly",
          count: 1,
          unitCostCents: FIXED_OVERHEAD_CENTS.supabase,
        },
      ],
    };
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

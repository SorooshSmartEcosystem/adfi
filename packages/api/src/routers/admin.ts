import { z } from "zod";
import { Agent } from "@orb/db";
import { router, adminProc } from "../trpc";
import { OrbError } from "../errors";
import {
  AVG_EVENT_COST_CENTS,
  BRAND_KIT_GENERATION_CENTS,
  VAPI_CENTS,
  VIDEO_AGENT_CENTS,
  VIDEO_RENDER_PER_SECOND_CENTS,
  VIDEO_TOTAL_CENTS,
  videoRenderCentsForDuration,
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

// Period helper used by financialsOverview / financialsPerService.
// Defaults to a rolling 30-day window — looking at "this calendar
// month" on May 1st gave a fully-empty dashboard, which was useless.
// 30d shows actual recent usage regardless of where we are in the month.
type Period = "7d" | "30d" | "month" | "all";

function periodStartFor(period: Period): Date {
  const now = Date.now();
  switch (period) {
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return startOfMonth();
    case "all":
      // Practical "all time" — start of 2024. Anything older was
      // pre-prod test data that shouldn't bias the dashboard.
      return new Date(Date.UTC(2024, 0, 1));
    case "30d":
    default:
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
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
          agentContexts: true,
        },
      });
      if (!user) throw OrbError.NOT_FOUND("user");
      return user;
    }),

  // Freeze a user — stops cron-driven token consumption (daily-content,
  // daily-pulse, weekly-scout, quarterly-strategist all filter
  // deletedAt:null) and webhook-driven consumption (Telegram +
  // Messenger inbound handlers also bail when deletedAt is set).
  // Sign-in is unaffected so the user could still use the app — for
  // a hard suspension we'd add Supabase Auth.admin.updateUserById
  // with `banned_until`, but for "freeze test users" the cron+webhook
  // gate is enough.
  suspendUser: adminProc
    .input(z.object({ id: z.string().uuid(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  // Inverse of suspendUser. Clears deletedAt so the user resumes
  // appearing in cron eligibility queries + webhook routing.
  unsuspendUser: adminProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.id },
        data: { deletedAt: null },
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

  financialsOverview: adminProc
    .input(
      z
        .object({
          period: z.enum(["7d", "30d", "month", "all"]).default("30d"),
        })
        .optional()
        .default({ period: "30d" }),
    )
    .query(async ({ ctx, input }) => {
    const period = input.period;
    const periodStart = periodStartFor(period);
    const now = new Date();

    // Users + subscriptions + businesses (multi-business adds Business
    // as a separate entity from User — we want to track both).
    const [
      totalUsers,
      trialCount,
      activeCount,
      pastDueCount,
      canceledCount,
      activeBusinesses,
      brandKitsTotal,
      brandKitVersionsThisMonth,
    ] = await Promise.all([
      ctx.db.user.count({ where: { deletedAt: null } }),
      ctx.db.subscription.count({ where: { status: "TRIALING" } }),
      ctx.db.subscription.count({ where: { status: "ACTIVE" } }),
      ctx.db.subscription.count({ where: { status: "PAST_DUE" } }),
      ctx.db.subscription.count({ where: { status: "CANCELED" } }),
      ctx.db.business.count({ where: { deletedAt: null } }),
      ctx.db.brandKit.count(),
      ctx.db.brandKitVersion.count({
        where: { createdAt: { gte: periodStart } },
      }),
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

    // Brand kit generations — each BrandKitVersion is one full generation
    // pass (~4 Opus calls + 3 Replicate images bundled into the per-gen
    // estimate in pricing.ts).
    const brandKitGenCents =
      brandKitVersionsThisMonth * BRAND_KIT_GENERATION_CENTS;

    // Vapi voice — sum call durations this month and price per minute.
    const callsThisMonth = await ctx.db.call.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { durationSeconds: true },
    });
    const totalCallSeconds = callsThisMonth.reduce(
      (s, c) => s + (c.durationSeconds ?? 0),
      0,
    );
    const totalCallMinutes = Math.ceil(totalCallSeconds / 60);
    const vapiCents = totalCallMinutes * VAPI_CENTS.perMinute;

    // Motion-reel videos — agent + render cost.
    //   - Agent cost is logged via recordAnthropicUsage (events with
    //     eventType in {video_script_generated, video_directive_generated}).
    //     The Anthropic call cost is already in payload.costCents.
    //   - Render cost scales with the video's duration (sec). We pull
    //     the duration from the persisted ContentDraft.motion field.
    const videoAgentEvents = events.filter(
      (e) =>
        e.eventType === "video_script_generated" ||
        e.eventType === "video_directive_generated",
    );
    const videoCount = videoAgentEvents.length;

    // Sum render seconds across drafts that rendered this month.
    // ContentDraft.motion has shape { kind, durationSeconds, status,
    // mp4Url } for scripts. Drafts in other states or without motion
    // contribute zero.
    const motionDrafts = await ctx.db.contentDraft.findMany({
      where: {
        updatedAt: { gte: periodStart },
        motion: { not: { equals: null } },
      },
      select: { motion: true },
    });
    let videoRenderSeconds = 0;
    for (const d of motionDrafts) {
      const m = d.motion as Record<string, unknown> | null;
      if (!m) continue;
      if (m.status !== "ready") continue;
      if (typeof m.durationSeconds === "number") {
        videoRenderSeconds += m.durationSeconds;
      } else {
        // Legacy directive renders had ~9s duration baked in.
        videoRenderSeconds += 9;
      }
    }
    const videoRenderCents = Math.round(
      videoRenderSeconds * VIDEO_RENDER_PER_SECOND_CENTS,
    );
    const videoAgentCents = Math.round(videoCount * VIDEO_AGENT_CENTS);
    const videoCents = videoAgentCents + videoRenderCents;

    const fixedCents =
      FIXED_OVERHEAD_CENTS.vercel +
      FIXED_OVERHEAD_CENTS.supabase +
      FIXED_OVERHEAD_CENTS.anthropicTeam;

    const variableCostCents =
      anthropicCents +
      replicateCents +
      twilioCents +
      brandKitGenCents +
      vapiCents +
      videoCents;
    const totalCostCents = variableCostCents + fixedCents;
    const grossMarginCents = mrrCents - variableCostCents;
    const grossMarginPct =
      mrrCents > 0 ? (grossMarginCents / mrrCents) * 100 : 0;

    return {
      period: {
        kind: period,
        start: periodStart.toISOString(),
        end: now.toISOString(),
      },
      users: {
        total: totalUsers,
        trialing: trialCount,
        active: activeCount,
        pastDue: pastDueCount,
        canceled: canceledCount,
      },
      businesses: {
        active: activeBusinesses,
        // ratio of users with multiple businesses → STUDIO/AGENCY usage
        multiBizUsers: Math.max(0, activeBusinesses - totalUsers),
      },
      brandKit: {
        kitsTotal: brandKitsTotal,
        regenerationsThisMonth: brandKitVersionsThisMonth,
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
        brandKitCents: brandKitGenCents,
        brandKitBreakdown: {
          generations: brandKitVersionsThisMonth,
          unitCents: BRAND_KIT_GENERATION_CENTS,
        },
        vapiCents,
        vapiBreakdown: {
          calls: callsThisMonth.length,
          totalMinutes: totalCallMinutes,
          unitCents: VAPI_CENTS.perMinute,
        },
        videoCents,
        videoBreakdown: {
          videos: videoCount,
          agentCents: videoAgentCents,
          renderCents: videoRenderCents,
          renderSeconds: videoRenderSeconds,
          agentUnitCents: VIDEO_AGENT_CENTS,
          renderUnitCentsPerSecond: VIDEO_RENDER_PER_SECOND_CENTS,
          typicalUnitCents: VIDEO_TOTAL_CENTS,
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
        brandKitGenerations: brandKitVersionsThisMonth,
        vapiCalls: callsThisMonth.length,
        vapiMinutes: totalCallMinutes,
        videosGenerated: videoCount,
        videoTotalSeconds: videoRenderSeconds,
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
          deletedAt: true,
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
          frozen: u?.deletedAt != null,
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
          // Surface the freeze marker so the admin UI can render a
          // banner + flip the freeze button label.
          deletedAt: user.deletedAt,
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

  financialsPerService: adminProc
    .input(
      z
        .object({
          period: z.enum(["7d", "30d", "month", "all"]).default("30d"),
        })
        .optional()
        .default({ period: "30d" }),
    )
    .query(async ({ ctx, input }) => {
    const period = input.period;
    const periodStart = periodStartFor(period);

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
    const brandKitGenerations = await ctx.db.brandKitVersion.count({
      where: { createdAt: { gte: periodStart } },
    });
    const callsThisPeriod = await ctx.db.call.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { durationSeconds: true },
    });
    const totalCallMinutes = Math.ceil(
      callsThisPeriod.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) / 60,
    );
    const videoCount = events.filter(
      (e) =>
        e.eventType === "video_script_generated" ||
        e.eventType === "video_directive_generated",
    ).length;

    return {
      period: {
        kind: period,
        start: periodStart.toISOString(),
        end: new Date().toISOString(),
      },
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
          name: "Brand Kit (Anthropic+Replicate)",
          costCents: brandKitGenerations * BRAND_KIT_GENERATION_CENTS,
          unit: "generations",
          count: brandKitGenerations,
          unitCostCents: BRAND_KIT_GENERATION_CENTS,
        },
        {
          name: "Vapi (voice calls)",
          costCents: totalCallMinutes * VAPI_CENTS.perMinute,
          unit: "minutes",
          count: totalCallMinutes,
          unitCostCents: VAPI_CENTS.perMinute,
        },
        {
          name: "Motion-reel video (Haiku + Lambda render)",
          costCents: Math.round(videoCount * VIDEO_TOTAL_CENTS),
          unit: "videos",
          count: videoCount,
          unitCostCents: Math.round(VIDEO_TOTAL_CENTS * 10) / 10,
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

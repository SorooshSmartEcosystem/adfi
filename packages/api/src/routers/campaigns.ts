import { z } from "zod";
import { CampaignPlatform, CampaignStatus } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { effectivePlan } from "../services/abuse-guard";
import {
  approveAndLaunchCampaign,
  draftCampaign,
  monthlyCampaignCap,
  monthlyCampaignSpendCapCents,
  pauseCampaign,
  planCanRunCampaigns,
  resumeCampaign,
} from "../services/campaigns";
import { notifyAdminOfError } from "../services/admin-notify";

// Plan-gated campaigns router. SOLO + TEAM users see a 403 on every
// mutation — the UI surfaces the upsell card before they get here, but
// the server side enforces too.
function assertCanRunCampaigns(plan: string): asserts plan is "STUDIO" | "AGENCY" {
  if (!planCanRunCampaigns(plan)) {
    throw OrbError.PLAN_LIMIT(
      "campaigns is a studio feature — upgrade to plan, run, and optimize paid ads",
    );
  }
}

export const campaignsRouter = router({
  // List campaigns scoped to the active business. Includes basic
  // metrics so the list view can render spend bars without a
  // separate query.
  list: authedProc.input(z.void()).query(async ({ ctx }) => {
    const plan = await effectivePlan(ctx.user.id);
    const campaigns = await ctx.db.campaign.findMany({
      where: { businessId: ctx.currentBusinessId ?? undefined },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        status: true,
        goal: true,
        platforms: true,
        schedule: true,
        createdAt: true,
        approvedAt: true,
        ads: { select: { id: true, format: true, platform: true } },
        // Aggregate spend so the row shows a progress bar without N+1.
        metrics: { select: { spendCents: true } },
      },
    });

    return {
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        goal: c.goal,
        platforms: c.platforms,
        schedule: c.schedule,
        createdAt: c.createdAt,
        approvedAt: c.approvedAt,
        adCount: c.ads.length,
        spendCents: c.metrics.reduce((s, m) => s + m.spendCents, 0),
      })),
      plan,
      canRunCampaigns: planCanRunCampaigns(plan),
      monthlyCap: monthlyCampaignCap(plan),
      monthlySpendCapCents: monthlyCampaignSpendCapCents(plan),
    };
  }),

  // Single campaign + its ads + recent metrics. The detail page reads
  // this and renders draft-review or running-metrics depending on
  // status.
  get: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          ads: { orderBy: { createdAt: "asc" } },
          metrics: { orderBy: { day: "desc" }, take: 30 },
        },
      });
      if (!campaign) throw OrbError.NOT_FOUND("campaign");
      return campaign;
    }),

  // Create a draft via the agent. Plan-gated. Counts against
  // monthly cap server-side.
  create: authedProc
    .input(
      z.object({
        brief: z.string().min(10).max(2000),
        platforms: z
          .array(z.nativeEnum(CampaignPlatform))
          .min(1)
          .max(4),
        totalBudgetCents: z.number().int().min(500).max(1000000),
        durationDays: z.number().int().min(1).max(60),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await effectivePlan(ctx.user.id);
      assertCanRunCampaigns(plan);
      if (!ctx.currentBusinessId) {
        throw OrbError.VALIDATION("no active business — pick one from the sidebar");
      }

      // Monthly cap check — count campaigns drafted in the current
      // calendar month for this business.
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const drafted = await ctx.db.campaign.count({
        where: {
          businessId: ctx.currentBusinessId,
          createdAt: { gte: monthStart },
        },
      });
      const cap = monthlyCampaignCap(plan);
      if (drafted >= cap) {
        throw OrbError.RATE_LIMIT(
          `you've drafted ${drafted}/${cap} campaigns this month on the ${plan.toLowerCase()} plan — wait for the 1st or upgrade`,
        );
      }

      // Spend cap — clamp the request to the plan's monthly spend cap.
      // The agent will respect this; if owner asked higher we silently
      // floor it (and surface in the UI so they know).
      const spendCap = monthlyCampaignSpendCapCents(plan);
      const clampedBudget = Math.min(input.totalBudgetCents, spendCap);

      try {
        const result = await draftCampaign({
          userId: ctx.user.id,
          businessId: ctx.currentBusinessId,
          brief: input.brief,
          platforms: input.platforms,
          totalBudgetCents: clampedBudget,
          durationDays: input.durationDays,
        });
        return { ...result, budgetClampedToCents: clampedBudget };
      } catch (err) {
        await notifyAdminOfError({
          source: "campaigns.create",
          error: err,
          meta: {
            userId: ctx.user.id,
            businessId: ctx.currentBusinessId,
            platforms: input.platforms,
          },
        });
        throw OrbError.EXTERNAL_API("the campaign manager");
      }
    }),

  // Approve + launch — Phase 1 marks the campaign approved but
  // doesn't push to platforms yet. UI surfaces a "drafts saved · push
  // lands next week" toast to set expectations.
  approveAndLaunch: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await effectivePlan(ctx.user.id);
      assertCanRunCampaigns(plan);
      return approveAndLaunchCampaign({
        userId: ctx.user.id,
        campaignId: input.id,
      });
    }),

  pause: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return pauseCampaign({ userId: ctx.user.id, campaignId: input.id });
    }),

  resume: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return resumeCampaign({ userId: ctx.user.id, campaignId: input.id });
    }),

  reject: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.campaign.update({
        where: { id: input.id },
        data: { status: CampaignStatus.REJECTED },
      });
      return { ok: true as const };
    }),

  // Notification surface — read-only list for the topbar bell, plus
  // ack mutations.
  listNotifications: authedProc
    .input(z.void())
    .query(async ({ ctx }) => {
      const rows = await ctx.db.campaignNotification.findMany({
        where: { userId: ctx.user.id, acknowledged: false },
        orderBy: { createdAt: "desc" },
        take: 25,
      });
      const unackCount = rows.length;
      return { items: rows, unackCount };
    }),

  acknowledgeNotification: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.campaignNotification.update({
        where: { id: input.id },
        data: { acknowledged: true, acknowledgedAt: new Date() },
      });
      return { ok: true as const };
    }),

  acknowledgeAllNotifications: authedProc
    .input(z.void())
    .mutation(async ({ ctx }) => {
      const r = await ctx.db.campaignNotification.updateMany({
        where: { userId: ctx.user.id, acknowledged: false },
        data: { acknowledged: true, acknowledgedAt: new Date() },
      });
      return { count: r.count };
    }),
});

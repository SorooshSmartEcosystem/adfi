// Campaigns orchestration. Translates the agent's CampaignManagerOutput
// into Campaign + CampaignAd rows, queues image backfill, and exposes
// the helpers the router uses (start, approve+launch, pause, etc.).
//
// Phase 1: drafts only — approve+launch persists status changes but
// doesn't push to Meta/Google. Phase 2/3 wire the platform pushes.

import {
  CampaignAdFormat,
  CampaignGoal,
  CampaignPlatform,
  CampaignStatus,
  Prisma,
  db,
} from "@orb/db";
import {
  runCampaignManager,
  backfillCampaignImages,
  type CampaignManagerOutput,
} from "../agents/campaign-manager";

// Plan ceiling — STUDIO+ only. Lower tiers don't get paid ads.
export function planCanRunCampaigns(plan: string | null): boolean {
  return plan === "STUDIO" || plan === "AGENCY";
}

// Monthly campaign cap per plan. STUDIO 2/mo, AGENCY 8/mo. Enforced
// at create-time in the router via this helper.
export function monthlyCampaignCap(plan: string | null): number {
  if (plan === "AGENCY") return 8;
  if (plan === "STUDIO") return 2;
  return 0;
}

// Spend ceiling per plan, in cents. Hard server-side cap — even if the
// owner sets a higher number in the brief, the agent's totalBudgetCents
// is clamped before being persisted.
export function monthlyCampaignSpendCapCents(plan: string | null): number {
  if (plan === "AGENCY") return 1000000; // $10,000
  if (plan === "STUDIO") return 150000;  //  $1,500
  return 0;
}

// ============================================================
// Draft a campaign — runs the agent, persists Campaign + CampaignAd
// rows, queues the image backfill in the background.
// ============================================================

export async function draftCampaign(args: {
  userId: string;
  businessId: string;
  brief: string;
  platforms: CampaignPlatform[];
  totalBudgetCents: number;
  durationDays: number;
}): Promise<{ campaignId: string }> {
  const output = await runCampaignManager({
    userId: args.userId,
    businessId: args.businessId,
    brief: args.brief,
    platforms: args.platforms,
    totalBudgetCents: args.totalBudgetCents,
    durationDays: args.durationDays,
  });

  // Compute schedule — start tomorrow by default, end after duration.
  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() + (output.schedule.startDateOffsetDays || 1));
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + output.schedule.durationDays);

  // Persist the Campaign + ads in a single transaction so a partial
  // write can't leave orphan ad rows pointing at a phantom campaign.
  const campaign = await db.$transaction(async (tx) => {
    const c = await tx.campaign.create({
      data: {
        userId: args.userId,
        businessId: args.businessId,
        status: CampaignStatus.AWAITING_REVIEW,
        name: output.name,
        brief: args.brief,
        goal: output.goal as CampaignGoal,
        audience: output.audience as unknown as Prisma.InputJsonValue,
        schedule: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalBudgetCents: output.schedule.totalBudgetCents,
        } as unknown as Prisma.InputJsonValue,
        platforms: args.platforms,
        reasoning: {
          summary: output.summary,
          policy: output.policy,
          perPlatform: Object.fromEntries(
            output.platformPlan.map((p) => [
              p.platform,
              { rationale: p.rationale, budgetCents: p.budgetCents },
            ]),
          ),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Insert all ads in one createMany call. Per-platform creative
    // shapes are stored as JSON; the platform push layer (Phase 2/3)
    // translates these into the API-shaped payloads each platform wants.
    const adRows = output.platformPlan.flatMap((p) =>
      p.ads.map((ad) => ({
        campaignId: c.id,
        platform: p.platform as CampaignPlatform,
        angle: ad.angle,
        format: ad.format as CampaignAdFormat,
        creative: ad.creative as unknown as Prisma.InputJsonValue,
        targeting: {
          // Targeting we computed at the campaign level — copied per ad
          // so each row is self-contained for the platform push.
          audience: output.audience,
          budgetCents: p.budgetCents,
          rationale: p.rationale,
        } as unknown as Prisma.InputJsonValue,
      })),
    );
    if (adRows.length > 0) {
      await tx.campaignAd.createMany({ data: adRows });
    }

    return c;
  });

  // Background image backfill — best-effort, failures logged in the
  // helper. Not awaited so the router returns fast.
  void backfillCampaignImages({
    userId: args.userId,
    campaignId: campaign.id,
  });

  return { campaignId: campaign.id };
}

// ============================================================
// Approve + launch — Phase 1 stub. Marks the campaign and ads as
// "approved." Actual platform push lands in Phase 2 (Meta) and
// Phase 3 (Google). For now, status flips to APPROVED-but-not-yet-
// pushed; we surface a "drafts saved · platform push lands next
// week" toast in the UI.
// ============================================================

export async function approveAndLaunchCampaign(args: {
  userId: string;
  campaignId: string;
}): Promise<{ launched: boolean; deferred: boolean }> {
  const campaign = await db.campaign.findFirst({
    where: { id: args.campaignId, userId: args.userId },
  });
  if (!campaign) throw new Error("campaign not found");
  if (campaign.status !== CampaignStatus.AWAITING_REVIEW) {
    throw new Error(`campaign is ${campaign.status.toLowerCase()}, not awaiting review`);
  }

  // Phase 2 will replace this with actual platform pushes. For Phase 1
  // we mark the campaign approved and ads as DRAFT (still not pushed).
  // The status stays AWAITING_REVIEW so future polling shows it's not
  // live yet — the UI can render "approved · waiting on platform push"
  // distinct from a fresh draft.
  await db.campaign.update({
    where: { id: campaign.id },
    data: {
      approvedAt: new Date(),
      // Keep status AWAITING_REVIEW until platform push wires up.
      // When Phase 2 lands, this becomes ACTIVE.
    },
  });

  return { launched: false, deferred: true };
}

// ============================================================
// Pause / resume — Phase 1 stubs. Same pattern: mark + defer.
// ============================================================

export async function pauseCampaign(args: {
  userId: string;
  campaignId: string;
}): Promise<{ paused: true }> {
  await db.campaign.update({
    where: { id: args.campaignId },
    data: {
      status: CampaignStatus.PAUSED,
      pausedAt: new Date(),
    },
  });
  return { paused: true as const };
}

export async function resumeCampaign(args: {
  userId: string;
  campaignId: string;
}): Promise<{ resumed: true }> {
  await db.campaign.update({
    where: { id: args.campaignId },
    data: {
      status: CampaignStatus.ACTIVE,
      pausedAt: null,
    },
  });
  return { resumed: true as const };
}

// ============================================================
// Pretty-print the campaign for the agent's "what i'm proposing"
// summary line that lands on the dashboard. Used by the router's
// list query so the dashboard can show one-liners.
// ============================================================

export function summaryLineFromCampaign(campaign: {
  name: string;
  status: string;
  goal: string;
  schedule: unknown;
}): string {
  const sched = (campaign.schedule ?? {}) as { totalBudgetCents?: number };
  const budget = sched.totalBudgetCents ?? 0;
  return `${campaign.name} · $${(budget / 100).toFixed(0)} · ${campaign.goal.toLowerCase()}`;
}

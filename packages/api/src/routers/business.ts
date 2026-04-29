import { z } from "zod";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { effectivePlan } from "../services/abuse-guard";
import { runStrategist } from "../agents/strategist";
import type { Plan, Prisma } from "@orb/db";

// Per-plan ceiling on how many active Businesses a User can own. Solo
// and Team are intentionally single-business — STUDIO unlocks 2,
// AGENCY unlocks 8. Trial inherits TEAM during the 7-day window so the
// user gets the full experience but can't seed multiple businesses.
const BUSINESS_LIMIT: Record<"TRIAL" | Plan, number> = {
  TRIAL: 1,
  SOLO: 1,
  TEAM: 1,
  STUDIO: 2,
  AGENCY: 8,
};

// Self-heal helper: every authenticated User must have at least one
// Business. Older accounts pre-date the 2026-04-28 migration; new
// signups should be covered by the migration's bootstrap. Either way,
// we never want an authed user landing on the dashboard without an
// active Business (the sidebar would crash).
async function ensureCurrentBusiness(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
): Promise<{ id: string }> {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.user.id },
    select: {
      id: true,
      email: true,
      currentBusinessId: true,
      businessName: true,
      businessDescription: true,
      businessLogoUrl: true,
      businessWebsiteUrl: true,
    },
  });
  if (!user) throw OrbError.NOT_FOUND("user");
  if (user.currentBusinessId) return { id: user.currentBusinessId };

  // No current business — bootstrap one from legacy User fields.
  const created = await ctx.db.business.create({
    data: {
      userId: user.id,
      name:
        user.businessName?.trim() ||
        user.email?.split("@")[0] ||
        "my business",
      description: user.businessDescription,
      logoUrl: user.businessLogoUrl,
      websiteUrl: user.businessWebsiteUrl,
    },
  });
  await ctx.db.user.update({
    where: { id: user.id },
    data: { currentBusinessId: created.id },
  });
  return { id: created.id };
}

export const businessRouter = router({
  // List all of the user's businesses + the active one's id. Used by the
  // sidebar dropdown.
  list: authedProc.input(z.void()).query(async ({ ctx }) => {
    const current = await ensureCurrentBusiness(ctx);
    const businesses = await ctx.db.business.findMany({
      where: { userId: ctx.user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        createdAt: true,
      },
    });
    const plan = await effectivePlan(ctx.user.id);
    return {
      businesses,
      currentId: current.id,
      plan,
      limit: BUSINESS_LIMIT[plan],
    };
  }),

  // Create a new Business. Enforces the per-plan ceiling so AGENCY can
  // grow up to 8, STUDIO up to 2, and SOLO/TEAM can't add a second.
  create: authedProc
    .input(
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(2000).optional(),
        websiteUrl: z.string().url().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureCurrentBusiness(ctx);
      const plan = await effectivePlan(ctx.user.id);
      const limit = BUSINESS_LIMIT[plan];
      const count = await ctx.db.business.count({
        where: { userId: ctx.user.id, deletedAt: null },
      });
      if (count >= limit) {
        throw OrbError.PLAN_LIMIT(
          `your ${plan.toLowerCase()} plan supports ${limit} business${
            limit === 1 ? "" : "es"
          } — upgrade to add more`,
        );
      }
      const created = await ctx.db.business.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          websiteUrl: input.websiteUrl ?? null,
        },
      });
      // Switch to the new business immediately — common case is the user
      // just created it because they want to work on it.
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { currentBusinessId: created.id },
      });
      // Same cache-bust as business.switch — see comment there.
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/", "layout");
      } catch {
        // Non-Next caller — skip.
      }

      // Run Strategist on the new business so it has its own brand
      // voice from day one. Without this, the dashboard layout would
      // bounce the user to /onboarding (no AgentContext for new
      // business → no voice → can't render specialist pages without
      // 500ing). Synchronous: the form's loading state covers the
      // 30-60s wall time. Failure is non-fatal — we still return the
      // created Business and let the user re-run Strategist from
      // /specialist/strategist if needed.
      if (input.description && input.description.trim().length >= 10) {
        try {
          // Reuse the user's primary goal — they already chose one
          // during their first business's onboarding. Falls back to
          // null if for some reason it isn't set; runStrategist
          // tolerates that by inferring from description.
          const userRow = await ctx.db.user.findUnique({
            where: { id: ctx.user.id },
            select: { goal: true },
          });
          const result = await runStrategist({
            businessDescription: input.description,
            // Reuse the goal the user picked for their primary
            // business; runStrategist requires a value and inferring
            // a different goal per business isn't useful here.
            goal: userRow?.goal ?? "MORE_CUSTOMERS",
            userId: ctx.user.id,
          });
          await ctx.db.agentContext.upsert({
            where: { businessId: created.id },
            update: {
              strategistOutput: result as unknown as Prisma.InputJsonValue,
              lastRefreshedAt: new Date(),
            },
            create: {
              userId: ctx.user.id,
              businessId: created.id,
              strategistOutput: result as unknown as Prisma.InputJsonValue,
              lastRefreshedAt: new Date(),
            },
          });
        } catch (err) {
          console.error(
            "[business.create] strategist run failed (non-fatal):",
            err,
          );
          // Swallow — business is still created, user can re-run
          // Strategist from the specialist page.
        }
      }

      return { id: created.id };
    }),

  // Read the active business's profile fields. The settings card uses
  // this so editing description/logo/website applies to the *current*
  // business, not to a hidden user-level field that leaks across all
  // of the user's businesses.
  getActive: authedProc.input(z.void()).query(async ({ ctx }) => {
    const current = await ensureCurrentBusiness(ctx);
    const row = await ctx.db.business.findUnique({
      where: { id: current.id },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
      },
    });
    if (!row) throw OrbError.NOT_FOUND("business");
    return row;
  }),

  // Update the active business's profile. Mirrors user.updateProfile
  // but writes the per-business row instead of the user-level legacy
  // fields. Cache-busts the layout so the sidebar avatar + name pick
  // up the new logo without a hard refresh.
  updateActive: authedProc
    .input(
      z.object({
        name: z.string().min(1).max(80).optional(),
        description: z.string().max(2000).nullable().optional(),
        logoUrl: z.string().url().max(500).nullable().optional(),
        websiteUrl: z
          .string()
          .max(500)
          .nullable()
          .optional()
          .transform((v) => {
            if (v === undefined || v === null) return v;
            const trimmed = v.trim();
            if (!trimmed) return null;
            return /^https?:\/\//i.test(trimmed)
              ? trimmed
              : `https://${trimmed}`;
          })
          .pipe(z.string().url().max(500).nullable().optional()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ensureCurrentBusiness(ctx);
      const row = await ctx.db.business.update({
        where: { id: current.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
          ...(input.websiteUrl !== undefined && {
            websiteUrl: input.websiteUrl,
          }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
        },
      });
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/", "layout");
      } catch {
        // Non-Next caller — skip.
      }
      return row;
    }),

  // Switch the active business. Doesn't migrate any data — just flips
  // currentBusinessId so the dashboard renders the chosen one.
  //
  // Cache-busting note: the React Query cache is invalidated on the
  // client (utils.invalidate()), and we revalidate the entire Next.js
  // Router Cache here so server-rendered pages re-fetch fresh per-
  // business data on the next navigation. Without revalidatePath the
  // user has to hard-refresh the browser to see the new business's
  // data — Next caches RSC payloads aggressively for fast back/forward.
  switch: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.business.findFirst({
        where: { id: input.id, userId: ctx.user.id, deletedAt: null },
        select: { id: true },
      });
      if (!target) throw OrbError.NOT_FOUND("business");
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { currentBusinessId: target.id },
      });
      // Bust every cached server-rendered route so the next navigation
      // re-runs the layout + page handlers with the new businessId.
      // Imported lazily to keep the @orb/api package usable in
      // non-Next contexts (mobile / admin / scripts).
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/", "layout");
      } catch {
        // Non-Next caller (e.g. test runner) — skip silently.
      }
      return { ok: true as const };
    }),
});

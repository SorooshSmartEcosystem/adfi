import { z } from "zod";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import {
  generateBrandKit,
  brandKitGenerationsRemaining,
  updateBrandKitImageStyle,
  updateBrandKitPalette,
  updateBrandKitTypography,
  getBrandKit,
  listBrandKitVersions,
  restoreBrandKitVersion,
  BRANDKIT_GENERATION_COST_CENTS,
  MONTHLY_BRANDKIT_CAP,
} from "../services/brand-kit";
import { effectivePlan } from "../services/abuse-guard";
import { notifyAdminOfError } from "../services/admin-notify";

const HEX = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex like #1A2B3C");

export const brandKitRouter = router({
  getMine: authedProc.input(z.void()).query(async ({ ctx }) => {
    const [kit, plan] = await Promise.all([
      getBrandKit({ userId: ctx.user.id, businessId: ctx.currentBusinessId }),
      effectivePlan(ctx.user.id),
    ]);
    const quota = await brandKitGenerationsRemaining(ctx.user.id, plan);
    return {
      kit,
      plan,
      quota,
      generationCostCents: BRANDKIT_GENERATION_COST_CENTS,
      monthlyCap: MONTHLY_BRANDKIT_CAP[plan],
    };
  }),

  generate: authedProc
    .input(
      z.object({
        refinementHint: z.string().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await effectivePlan(ctx.user.id);
      const { remaining, cap, used } = await brandKitGenerationsRemaining(
        ctx.user.id,
        plan,
      );
      if (remaining <= 0) {
        throw OrbError.RATE_LIMIT(
          `you've used ${used}/${cap} brandkit generations this month on the ${plan.toLowerCase()} plan — upgrade or wait for the rolling window to refresh`,
        );
      }
      try {
        const result = await generateBrandKit({
          userId: ctx.user.id,
          businessId: ctx.currentBusinessId,
          refinementHint: input.refinementHint,
        });
        return result;
      } catch (err) {
        await notifyAdminOfError({
          source: "brandKit.generate",
          error: err,
          meta: {
            userId: ctx.user.id,
            plan,
            refinementHint: input.refinementHint ?? null,
          },
        });
        throw OrbError.EXTERNAL_API("the design service");
      }
    }),

  updateImageStyle: authedProc
    .input(
      z.object({
        imageStyle: z.string().min(20).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getBrandKit({
        userId: ctx.user.id,
        businessId: ctx.currentBusinessId,
      });
      if (!existing) {
        throw OrbError.VALIDATION(
          "generate a brandkit first before editing its image style",
        );
      }
      await updateBrandKitImageStyle({
        userId: ctx.user.id,
        businessId: ctx.currentBusinessId,
        imageStyle: input.imageStyle,
      });
      return { ok: true as const };
    }),

  // Inline palette edit. Doesn't regenerate logos — SVGs use {{token}}
  // placeholders so a single hex change re-renders the entire kit.
  updatePalette: authedProc
    .input(
      z.object({
        primary: HEX.optional(),
        secondary: HEX.optional(),
        accent: HEX.optional(),
        ink: HEX.optional(),
        surface: HEX.optional(),
        bg: HEX.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getBrandKit({
        userId: ctx.user.id,
        businessId: ctx.currentBusinessId,
      });
      if (!existing) {
        throw OrbError.VALIDATION("generate a brandkit first");
      }
      await updateBrandKitPalette({
        userId: ctx.user.id,
        businessId: ctx.currentBusinessId,
        palette: input,
      });
      return { ok: true as const };
    }),

  // All historical versions of the active business's brand kit.
  listVersions: authedProc.input(z.void()).query(async ({ ctx }) => {
    return listBrandKitVersions({
      userId: ctx.user.id,
      businessId: ctx.currentBusinessId,
    });
  }),

  // Restore a past version into the live row. Doesn't consume a
  // regeneration credit — no LLM is called.
  restoreVersion: authedProc
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await restoreBrandKitVersion({
          userId: ctx.user.id,
          businessId: ctx.currentBusinessId,
          versionId: input.versionId,
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not found") || msg.includes("no brandkit")) {
          throw OrbError.NOT_FOUND("brand kit version");
        }
        throw err;
      }
    }),

  updateTypography: authedProc
    .input(
      z.object({
        headingFont: z.string().min(1).max(100).optional(),
        bodyFont: z.string().min(1).max(100).optional(),
        weights: z.array(z.string().max(20)).max(6).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getBrandKit({
        userId: ctx.user.id,
        businessId: ctx.currentBusinessId,
      });
      if (!existing) {
        throw OrbError.VALIDATION("generate a brandkit first");
      }
      await updateBrandKitTypography({
        userId: ctx.user.id,
        businessId: ctx.currentBusinessId,
        typography: input,
      });
      return { ok: true as const };
    }),
});

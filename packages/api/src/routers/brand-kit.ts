import { z } from "zod";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import {
  generateBrandKit,
  brandKitGenerationsRemaining,
  updateBrandKitImageStyle,
  getBrandKit,
  BRANDKIT_GENERATION_COST_CENTS,
  MONTHLY_BRANDKIT_CAP,
} from "../services/brand-kit";
import { effectivePlan } from "../services/abuse-guard";

export const brandKitRouter = router({
  // Read the user's current kit. Returns null if they haven't generated
  // one yet — onboarding step + /specialist/brandkit page both use this
  // to decide whether to show the "generate" CTA or the panel.
  getMine: authedProc.input(z.void()).query(async ({ ctx }) => {
    const [kit, plan] = await Promise.all([
      getBrandKit(ctx.user.id),
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

  // Run the full generation pipeline. Charges against the plan cap.
  // Optional `refinementHint` biases the spec toward a direction the user
  // describes ("more bold", "softer palette", "for skincare not finance").
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
          refinementHint: input.refinementHint,
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("brandKit.generate failed:", err);
        throw OrbError.EXTERNAL_API(`couldn't generate brandkit: ${msg}`);
      }
    }),

  // Inline tweak to just the imageStyle prompt. Doesn't charge against the
  // generation cap (no LLM / no Replicate call) — only Echo's next image
  // run will consume tokens.
  updateImageStyle: authedProc
    .input(
      z.object({
        imageStyle: z.string().min(20).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getBrandKit(ctx.user.id);
      if (!existing) {
        throw OrbError.VALIDATION(
          "generate a brandkit first before editing its image style",
        );
      }
      await updateBrandKitImageStyle({
        userId: ctx.user.id,
        imageStyle: input.imageStyle,
      });
      return { ok: true as const };
    }),
});

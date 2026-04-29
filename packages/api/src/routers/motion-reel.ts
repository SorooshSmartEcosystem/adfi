import { z } from "zod";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { renderForDraft } from "../services/motion-reel";

// Same shape as MotionDirective in @orb/motion-reel — duplicated here
// as Zod schemas so the tRPC layer validates inputs without pulling
// the React-heavy package into the validator path.

const QuoteContentSchema = z.object({
  quote: z.string().min(1).max(280),
  attribution: z.string().max(80).optional(),
});

const StatContentSchema = z.object({
  value: z.union([z.number(), z.string()]),
  prefix: z.string().max(8).optional(),
  suffix: z.string().max(8).optional(),
  label: z.string().min(1).max(80),
  context: z.string().min(1).max(220),
});

const ListContentSchema = z.object({
  title: z.string().min(1).max(120),
  items: z
    .array(
      z.object({
        headline: z.string().min(1).max(80),
        body: z.string().min(1).max(220),
      }),
    )
    .min(2)
    .max(4),
});

const ProductRevealSchema = z.object({
  heroImageUrl: z.string().url(),
  name: z.string().min(1).max(80),
  tagline: z.string().max(160).optional(),
  priceLabel: z.string().max(40).optional(),
  cta: z.string().max(40).optional(),
});

const CarouselAsReelSchema = z.object({
  slides: z
    .array(
      z.object({
        imageUrl: z.string().url().optional(),
        headline: z.string().min(1).max(120),
        body: z.string().max(280).optional(),
      }),
    )
    .min(2)
    .max(8),
});

const DirectiveSchema = z.discriminatedUnion("template", [
  z.object({ template: z.literal("quote"), content: QuoteContentSchema }),
  z.object({ template: z.literal("stat"), content: StatContentSchema }),
  z.object({ template: z.literal("list"), content: ListContentSchema }),
  z.object({ template: z.literal("product-reveal"), content: ProductRevealSchema }),
  z.object({ template: z.literal("carousel-as-reel"), content: CarouselAsReelSchema }),
]);

export const motionReelRouter = router({
  // Trigger a render for a draft. Synchronous from the user's POV —
  // returns once the mp4 is uploaded. Render takes 10-30s on a 2GB
  // function; the maxDuration: 300 on api/trpc covers it.
  //
  // Today only `quote` and `stat` actually have compositions wired
  // (Phase 1). Choosing a template that doesn't exist yet (list /
  // product-reveal / carousel-as-reel) errors with a clear message.
  renderForDraft: authedProc
    .input(
      z.object({
        draftId: z.string().uuid(),
        directive: DirectiveSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Forward the user's session cookie to the internal render
        // route so it can re-verify the user. Without this the
        // route's createServerClient() finds no session and 401s.
        const result = await renderForDraft({
          userId: ctx.user.id,
          draftId: input.draftId,
          directive: input.directive,
          cookieHeader: ctx.headers.get("cookie") ?? "",
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw OrbError.EXTERNAL_API(`motion-reel render failed: ${msg}`);
      }
    }),

  // Read the motion state of a draft. Used by the UI to poll/refresh
  // after a render is in flight or to display a previously-rendered
  // mp4 when the page loads.
  get: authedProc
    .input(z.object({ draftId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.draftId, userId: ctx.user.id },
        select: { id: true, motion: true },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      return draft.motion as Record<string, unknown> | null;
    }),
});

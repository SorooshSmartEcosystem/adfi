import { z } from "zod";
import { Plan } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

export const billingRouter = router({
  getCurrent: authedProc.input(z.void()).query(async ({ ctx }) => {
    return ctx.db.subscription.findFirst({
      where: {
        userId: ctx.user.id,
        status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  changePlan: authedProc.input(z.object({ plan: z.nativeEnum(Plan) })).mutation(
    () => {
      throw OrbError.EXTERNAL_API("Stripe");
    },
  ),

  createPortalSession: authedProc.input(z.void()).mutation(() => {
    throw OrbError.EXTERNAL_API("Stripe");
  }),

  cancel: authedProc
    .input(z.object({ reason: z.string().max(300).optional() }))
    .mutation(() => {
      throw OrbError.EXTERNAL_API("Stripe");
    }),

  resumeCanceled: authedProc.input(z.void()).mutation(() => {
    throw OrbError.EXTERNAL_API("Stripe");
  }),
});

import { z } from "zod";
import { Plan } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import type { Context } from "../context";
import { priceIdForPlan, stripe } from "../services/stripe";

type AuthedCtx = Context & { user: NonNullable<Context["user"]> };

function appUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_WEB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!url) {
    throw OrbError.VALIDATION(
      "NEXT_PUBLIC_WEB_URL or VERCEL_URL must be set for billing redirects",
    );
  }
  return url;
}

async function getOrCreateCustomerId(ctx: AuthedCtx): Promise<string> {
  const existing = await ctx.db.subscription.findFirst({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.stripeCustomerId;

  const customer = await stripe().customers.create({
    email: ctx.user.email ?? undefined,
    metadata: { userId: ctx.user.id },
  });
  return customer.id;
}

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

  // Starts a Stripe Checkout session with a 7-day trial. The session's
  // success_url lands the user on /onboarding/phone so onboarding continues;
  // the webhook persists the Subscription row.
  createCheckout: authedProc
    .input(z.object({ plan: z.nativeEnum(Plan) }))
    .mutation(async ({ ctx, input }) => {
      const customerId = await getOrCreateCustomerId(ctx);
      const base = appUrl();

      try {
        const session = await stripe().checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          line_items: [{ price: priceIdForPlan(input.plan), quantity: 1 }],
          subscription_data: {
            trial_period_days: 7,
            metadata: { userId: ctx.user.id, plan: input.plan },
          },
          payment_method_collection: "always",
          success_url: `${base}/onboarding/phone?billing=ok`,
          cancel_url: `${base}/onboarding/plan?billing=canceled`,
          metadata: { userId: ctx.user.id, plan: input.plan },
        });
        if (!session.url) throw new Error("Stripe did not return a URL");
        return { url: session.url };
      } catch (error) {
        console.error("Stripe createCheckout failed:", error);
        throw OrbError.EXTERNAL_API("Stripe");
      }
    }),

  // Opens the Stripe customer portal — plan change, card update, cancel.
  createPortalSession: authedProc.input(z.void()).mutation(async ({ ctx }) => {
    const existing = await ctx.db.subscription.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!existing) throw OrbError.NOT_FOUND("subscription");

    try {
      const session = await stripe().billingPortal.sessions.create({
        customer: existing.stripeCustomerId,
        return_url: `${appUrl()}/settings`,
      });
      return { url: session.url };
    } catch (error) {
      console.error("Stripe portal failed:", error);
      throw OrbError.EXTERNAL_API("Stripe");
    }
  }),

  changePlan: authedProc
    .input(z.object({ plan: z.nativeEnum(Plan) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.subscription.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: "desc" },
      });
      if (!existing) throw OrbError.NOT_FOUND("subscription");

      try {
        const sub = await stripe().subscriptions.retrieve(
          existing.stripeSubscriptionId,
        );
        const item = sub.items.data[0];
        if (!item) throw new Error("no subscription item");

        await stripe().subscriptions.update(existing.stripeSubscriptionId, {
          items: [{ id: item.id, price: priceIdForPlan(input.plan) }],
          proration_behavior: "create_prorations",
        });
        return { ok: true as const };
      } catch (error) {
        console.error("Stripe changePlan failed:", error);
        throw OrbError.EXTERNAL_API("Stripe");
      }
    }),

  cancel: authedProc
    .input(z.object({ reason: z.string().max(300).optional() }))
    .mutation(async ({ ctx }) => {
      const existing = await ctx.db.subscription.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: "desc" },
      });
      if (!existing) throw OrbError.NOT_FOUND("subscription");

      try {
        await stripe().subscriptions.update(existing.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        return { ok: true as const };
      } catch (error) {
        console.error("Stripe cancel failed:", error);
        throw OrbError.EXTERNAL_API("Stripe");
      }
    }),

  resumeCanceled: authedProc.input(z.void()).mutation(async ({ ctx }) => {
    const existing = await ctx.db.subscription.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!existing) throw OrbError.NOT_FOUND("subscription");

    try {
      await stripe().subscriptions.update(existing.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      return { ok: true as const };
    } catch (error) {
      console.error("Stripe resume failed:", error);
      throw OrbError.EXTERNAL_API("Stripe");
    }
  }),
});

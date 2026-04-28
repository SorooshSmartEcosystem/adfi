import { z } from "zod";
import { Plan } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import type { Context } from "../context";
import { priceIdForPlan, stripe } from "../services/stripe";
import { getCurrentUsage } from "../services/quota";

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
  getUsage: authedProc.input(z.void()).query(async ({ ctx }) => {
    return getCurrentUsage(ctx.user.id);
  }),

  getCurrent: authedProc.input(z.void()).query(async ({ ctx }) => {
    return ctx.db.subscription.findFirst({
      where: {
        userId: ctx.user.id,
        status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Starts a Stripe Checkout session with a 7-day trial. Used for the
  // FIRST subscription on a user account — the onboarding flow.
  //
  // Refuses to create a new checkout if the user already has an
  // ACTIVE/TRIALING/PAST_DUE subscription — that path was double-charging
  // users who tried to upgrade from settings (the old code blindly
  // created a 2nd subscription). Existing-sub upgrades go through
  // `changePlan` instead, which uses Stripe's subscription update flow
  // (proration, no second invoice).
  createCheckout: authedProc
    .input(
      z.object({
        plan: z.nativeEnum(Plan),
        // 'onboarding' (new signup) | 'settings' (existing user
        // returning to billing) | 'campaigns' (came from /campaigns
        // upsell) | etc. Drives where Stripe sends the user after
        // success/cancel.
        from: z.enum(["onboarding", "settings", "campaigns"]).default("onboarding"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingActive = await ctx.db.subscription.findFirst({
        where: {
          userId: ctx.user.id,
          status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
        },
        orderBy: { createdAt: "desc" },
      });
      if (existingActive) {
        // The user already has a paid subscription — they should be
        // calling changePlan (which uses Stripe's subscription update
        // for proration) or the customer portal, NOT createCheckout
        // (which spawns a second sub on the same customer).
        throw OrbError.VALIDATION(
          existingActive.plan === input.plan
            ? `you're already on the ${input.plan.toLowerCase()} plan`
            : "you already have an active subscription — use change plan instead of starting a new one",
        );
      }

      const customerId = await getOrCreateCustomerId(ctx);
      const base = appUrl();

      // Where Stripe sends the user back after checkout. Onboarding
      // goes to /onboarding/phone (next step in signup); upgrades from
      // anywhere else return to where they came from.
      const successPath =
        input.from === "settings"
          ? "/settings#billing"
          : input.from === "campaigns"
            ? "/campaigns"
            : "/onboarding/phone";
      const cancelPath =
        input.from === "settings"
          ? "/settings#billing"
          : input.from === "campaigns"
            ? "/campaigns"
            : "/onboarding/plan";

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
          success_url: `${base}${successPath}?billing=ok`,
          cancel_url: `${base}${cancelPath}?billing=canceled`,
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

      // Same-plan guard: refuse so we don't bill the user a proration
      // fee on a no-op change. The UI hides the button for the
      // current plan but server-side enforcement is the safety net.
      if (existing.plan === input.plan) {
        throw OrbError.VALIDATION(
          `you're already on the ${input.plan.toLowerCase()} plan`,
        );
      }

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

        // Update the local Subscription row right away so the UI shows
        // the new plan without waiting for the webhook. The webhook
        // (subscription.updated) will set the same fields when it
        // arrives — idempotent.
        await ctx.db.subscription.update({
          where: { id: existing.id },
          data: { plan: input.plan },
        });

        // Sync the current period's credit ceiling so the user sees
        // their new plan's credits immediately. UserUsage.creditsLimit
        // is a snapshot of the plan at first-touch of the period; on
        // upgrade we bump it to the new plan's limit. We never lower
        // creditsLimit on a downgrade mid-period — keep what they
        // already paid for. Per-plan caps are imported from quota.ts.
        const { PLAN_LIMITS, periodFor } = await import("../services/quota");
        const newLimit = PLAN_LIMITS[input.plan];
        const period = periodFor();
        const usage = await ctx.db.userUsage.findUnique({
          where: { userId_period: { userId: ctx.user.id, period } },
        });
        if (usage && newLimit > usage.creditsLimit) {
          await ctx.db.userUsage.update({
            where: { id: usage.id },
            data: { creditsLimit: newLimit, plan: input.plan },
          });
        }

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

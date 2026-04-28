import { NextResponse } from "next/server";
import { db, SubscriptionStatus } from "@orb/db";
import { stripe, planForPriceId } from "@orb/api";

type StripeSubscription = Awaited<
  ReturnType<ReturnType<typeof stripe>["subscriptions"]["retrieve"]>
>;
type StripeCheckoutSession = Awaited<
  ReturnType<ReturnType<typeof stripe>["checkout"]["sessions"]["retrieve"]>
>;
type StripeEvent = ReturnType<
  ReturnType<typeof stripe>["webhooks"]["constructEvent"]
>;

export const runtime = "nodejs";

// Maps Stripe subscription.status → our SubscriptionStatus enum.
function mapStatus(s: StripeSubscription["status"]): SubscriptionStatus {
  switch (s) {
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELED;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    default:
      return SubscriptionStatus.PAST_DUE;
  }
}

async function upsertSubscription(sub: StripeSubscription) {
  const userId = sub.metadata?.userId;
  if (!userId) {
    console.warn("stripe webhook: subscription has no userId metadata", sub.id);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  if (!item || !priceId) return;
  const plan = planForPriceId(priceId);
  if (!plan) {
    console.warn("stripe webhook: unknown price id", priceId);
    return;
  }

  // In Stripe's 2026-04-22 API `current_period_end` lives on the item, not
  // the subscription. Fall back to 30 days from now as a last resort.
  const periodEnd =
    (item as unknown as { current_period_end?: number }).current_period_end ??
    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: {
      status: mapStatus(sub.status),
      plan,
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    create: {
      userId,
      stripeCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripeSubscriptionId: sub.id,
      plan,
      status: mapStatus(sub.status),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  // Sync the current period's credit ceiling so usage reflects the new
  // plan immediately. We never lower creditsLimit on a downgrade
  // mid-period — the user already paid for the higher cap. PLAN_LIMITS
  // + periodFor are imported lazily to keep the webhook bundle small.
  const status = mapStatus(sub.status);
  if (status === "ACTIVE" || status === "TRIALING") {
    try {
      const { PLAN_LIMITS, periodFor } = await import("@orb/api");
      const newLimit = PLAN_LIMITS[plan];
      const period = periodFor();
      const usage = await db.userUsage.findUnique({
        where: { userId_period: { userId, period } },
      });
      if (usage && newLimit > usage.creditsLimit) {
        await db.userUsage.update({
          where: { id: usage.id },
          data: { creditsLimit: newLimit, plan },
        });
      } else if (!usage) {
        await db.userUsage.create({
          data: { userId, period, creditsLimit: newLimit, plan },
        });
      }
    } catch (err) {
      console.warn("stripe webhook: credit sync failed:", err);
    }
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "missing signature or webhook secret" },
      { status: 400 },
    );
  }

  const body = await request.text();
  let event: StripeEvent;
  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.trial_will_end":
        await upsertSubscription(event.data.object as StripeSubscription);
        break;

      case "checkout.session.completed": {
        const session = event.data.object as StripeCheckoutSession;
        if (session.subscription && typeof session.subscription === "string") {
          const sub = await stripe().subscriptions.retrieve(session.subscription);
          await upsertSubscription(sub);
        }
        break;
      }

      default:
        // Other events (invoice.*, customer.*) — ignore for now.
        break;
    }
  } catch (error) {
    console.error("stripe webhook handler failed:", error);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

import Stripe from "stripe";
import { Plan } from "@orb/db";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  client = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return client;
}

const PRICE_BY_PLAN: Record<Plan, string | undefined> = {
  SOLO: process.env.STRIPE_PRICE_SOLO,
  TEAM: process.env.STRIPE_PRICE_TEAM,
  STUDIO: process.env.STRIPE_PRICE_STUDIO,
  AGENCY: process.env.STRIPE_PRICE_AGENCY,
};

export function priceIdForPlan(plan: Plan): string {
  const id = PRICE_BY_PLAN[plan];
  if (!id) throw new Error(`STRIPE_PRICE_${plan} env var is not set`);
  return id;
}

const PLAN_BY_PRICE: Record<string, Plan> = {};
for (const [plan, id] of Object.entries(PRICE_BY_PLAN)) {
  if (id) PLAN_BY_PRICE[id] = plan as Plan;
}

export function planForPriceId(priceId: string): Plan | null {
  return PLAN_BY_PRICE[priceId] ?? null;
}

export const PLAN_PRICES_CENTS: Record<Plan, number> = {
  SOLO: 2900,
  TEAM: 7900,
  STUDIO: 19900,
  AGENCY: 49900,
};

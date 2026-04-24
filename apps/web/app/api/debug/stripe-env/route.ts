import { NextResponse } from "next/server";

// TEMP diagnostic — reports the shape of STRIPE_* envs without leaking them.
// Price IDs aren't secrets (they're visible in Stripe Checkout URLs anyway)
// but we still mask secret keys to length + prefix only. Remove once billing
// is confirmed working.
export const runtime = "nodejs";

function shape(
  name: string,
  value: string | undefined,
  reveal = false,
): Record<string, unknown> {
  if (value === undefined) return { name, present: false };
  return {
    name,
    present: true,
    length: value.length,
    prefix: value.slice(0, 6),
    value: reveal ? value : undefined,
  };
}

export async function GET() {
  return NextResponse.json(
    {
      STRIPE_SECRET_KEY: shape(
        "STRIPE_SECRET_KEY",
        process.env.STRIPE_SECRET_KEY,
      ),
      STRIPE_WEBHOOK_SECRET: shape(
        "STRIPE_WEBHOOK_SECRET",
        process.env.STRIPE_WEBHOOK_SECRET,
      ),
      // Price IDs are reveal=true because they are NOT secrets — they show up
      // in Stripe Checkout URLs. Reveal them so we can verify the value.
      STRIPE_PRICE_SOLO: shape(
        "STRIPE_PRICE_SOLO",
        process.env.STRIPE_PRICE_SOLO,
        true,
      ),
      STRIPE_PRICE_TEAM: shape(
        "STRIPE_PRICE_TEAM",
        process.env.STRIPE_PRICE_TEAM,
        true,
      ),
      STRIPE_PRICE_STUDIO: shape(
        "STRIPE_PRICE_STUDIO",
        process.env.STRIPE_PRICE_STUDIO,
        true,
      ),
    },
    { status: 200 },
  );
}

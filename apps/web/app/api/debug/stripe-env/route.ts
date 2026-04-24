import { NextResponse } from "next/server";
import { stripe } from "@orb/api";

// TEMP diagnostic — reports the shape of STRIPE_* envs without leaking them,
// plus probes whether each price ID exists in the account that owns the
// deployed STRIPE_SECRET_KEY. Remove once billing is confirmed working.
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

async function probePrice(id: string | undefined) {
  if (!id) return { id: null, ok: false, error: "env not set" };
  try {
    const price = await stripe().prices.retrieve(id);
    return {
      id,
      ok: true,
      amount: price.unit_amount,
      currency: price.currency,
      active: price.active,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { id, ok: false, error: msg };
  }
}

export async function GET() {
  let keyLivemode: boolean | null = null;
  let keyError: string | null = null;
  try {
    const balance = await stripe().balance.retrieve();
    keyLivemode = balance.livemode;
  } catch (error) {
    keyError = error instanceof Error ? error.message : String(error);
  }

  const [solo, team, studio] = await Promise.all([
    probePrice(process.env.STRIPE_PRICE_SOLO),
    probePrice(process.env.STRIPE_PRICE_TEAM),
    probePrice(process.env.STRIPE_PRICE_STUDIO),
  ]);

  return NextResponse.json(
    {
      envs: {
        STRIPE_SECRET_KEY: shape(
          "STRIPE_SECRET_KEY",
          process.env.STRIPE_SECRET_KEY,
        ),
        STRIPE_WEBHOOK_SECRET: shape(
          "STRIPE_WEBHOOK_SECRET",
          process.env.STRIPE_WEBHOOK_SECRET,
        ),
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
      key_livemode: keyLivemode,
      key_error: keyError,
      prices: { solo, team, studio },
    },
    { status: 200 },
  );
}

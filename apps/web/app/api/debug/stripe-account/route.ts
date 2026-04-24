import { NextResponse } from "next/server";
import { stripe } from "@orb/api";

// TEMP diagnostic — reports which Stripe account the deployed STRIPE_SECRET_KEY
// belongs to, plus attempts to retrieve each configured price in that account.
// Used to catch "price from account A, key from account B" mismatches.
export const runtime = "nodejs";

async function checkPrice(id: string | undefined) {
  if (!id) return { id: null, ok: false, error: "env not set" };
  try {
    const price = await stripe().prices.retrieve(id);
    return {
      id,
      ok: true,
      nickname: price.nickname,
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
  try {
    const account = await stripe().accounts.retrieve();
    const [solo, team, studio] = await Promise.all([
      checkPrice(process.env.STRIPE_PRICE_SOLO),
      checkPrice(process.env.STRIPE_PRICE_TEAM),
      checkPrice(process.env.STRIPE_PRICE_STUDIO),
    ]);
    return NextResponse.json(
      {
        account: {
          id: account.id,
          email: account.email,
          country: account.country,
          business_profile: account.business_profile?.name,
          livemode: account.charges_enabled,
        },
        prices: { solo, team, studio },
      },
      { status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

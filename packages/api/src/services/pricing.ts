// Cost constants + estimation helpers for the admin financial reports.
// Prices are in CENTS (integers). All per-token prices come from Anthropic's
// public pricing + our ARCHITECTURE.md plan choices.
//
// These are approximations. When we log real token usage in agent_events, the
// per-event estimator can be upgraded to read actual tokens. For now it uses
// observed averages from our own test runs.

export const MODEL_PRICING = {
  "claude-opus-4-7": { inputPerM: 500, outputPerM: 2500 }, // $5 / $25 per M tokens
  "claude-sonnet-4-6": { inputPerM: 300, outputPerM: 1500 }, // $3 / $15 per M
  "claude-haiku-4-5": { inputPerM: 100, outputPerM: 500 }, // $1 / $5 per M
} as const;

// Observed average cost per agent run (cents). Calibrated from real test
// runs on Maya's data. Update these as more real usage data lands.
export const AVG_EVENT_COST_CENTS = {
  STRATEGIST: 2.0,
  ECHO_DRAFT: 2.0,
  ECHO_REGENERATE: 2.0,
  SCOUT_SWEEP: 1.7,
  PULSE_SWEEP: 1.4,
  SIGNAL_SMS: 0.8,
} as const;

// Brand kit generation: ~4 Opus 4.7 calls (palette, typography, logo SVG,
// image style prompt) + 3 Flux cover samples on Replicate. Estimated total
// ~40 cents per generation (Opus calls are expensive — logo SVG alone uses
// 24k output tokens). Replaced once we log real token usage on each step.
export const BRAND_KIT_GENERATION_CENTS = 40;

// Motion-reel video — broken out so the breakdown panel can show
// agent vs render separately. Total per video: ~2 cents.
//   - Sonnet directive generation: ~1.5k input + 500 output tokens
//     at Sonnet 4.6 prices = ~1.2 cents
//   - Vercel compute: ~45s @ 2GB = 0.025 GB-hours, ~0.5 cents at the
//     overage rate of $0.18/GB-hour (free within Pro included 1000
//     GB-hours/month — this number is the marginal-after-quota cost)
//   - Supabase upload + bandwidth: negligible (~5MB mp4)
// Replace once we log real per-render token + compute time.
export const VIDEO_AGENT_CENTS = 1.2;
export const VIDEO_RENDER_CENTS = 0.8;
export const VIDEO_TOTAL_CENTS = VIDEO_AGENT_CENTS + VIDEO_RENDER_CENTS;

// Vapi voice — bundled per-minute price covering OpenAI realtime model +
// Vapi platform fee + Twilio outbound. Approx 18¢/minute for our config.
export const VAPI_CENTS = {
  perMinute: 18,
};

// Twilio US pricing
export const TWILIO_CENTS = {
  localNumberMonthly: 100, // $1.00
  outboundSms: 0.75, // ~$0.0075 per segment
  inboundSms: 0.75,
  campaignRegistration: 1000, // $10 one-time
};

// Plan prices — wired to Stripe price IDs via STRIPE_PRICE_<TIER> env.
// Gross margin calculations use these as MRR per active user.
//
// 2026-04-28 reshape: SOLO drops to $29 (was $49), TEAM drops to $79
// (was $99), STUDIO unchanged at $199 but now includes 2 businesses,
// new AGENCY at $499 for up to 8 businesses with 2000 shared credits.
// Each tier unlocks a capability gate (calls, multi-business, white
// label) so the upgrade ladder feels like more than just more credits.
export const PLAN_PRICING_CENTS = {
  SOLO: 2900, // $29/mo
  TEAM: 7900, // $79/mo
  STUDIO: 19900, // $199/mo
  AGENCY: 49900, // $499/mo
} as const;

// Fixed monthly overhead not tied to user volume
export const FIXED_OVERHEAD_CENTS = {
  vercel: 2000, // $20 Pro
  supabase: 2500, // $25 after free tier
  anthropicTeam: 0, // no team plan yet
};

export function estimateAnthropicCostCents(args: {
  model: keyof typeof MODEL_PRICING;
  inputTokens: number;
  outputTokens: number;
}): number {
  const p = MODEL_PRICING[args.model];
  const inputCost = (args.inputTokens / 1_000_000) * p.inputPerM;
  const outputCost = (args.outputTokens / 1_000_000) * p.outputPerM;
  return Math.round(inputCost + outputCost);
}

// Prefers the real cost logged in payload.costCents (written by
// recordAnthropicUsage) when available, falling back to observed
// averages for legacy events that pre-date usage logging.
//
// Self-healing: when payload.costCents is 0 or missing but the
// payload still carries inputTokens + outputTokens + model, we
// recompute from the tokens. Earlier versions of recordAnthropicUsage
// stored 0 when the model id didn't match MODEL_PRICING (Anthropic
// started returning date-suffixed ids that broke exact matching).
// This recovery means the admin dashboard heals retroactively without
// a database backfill.
export function estimateEventCostCents(
  eventType: string,
  agent: string,
  payload?: unknown,
): number {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const stored = typeof p.costCents === "number" ? p.costCents : null;
    if (stored && stored > 0) return Math.round(stored);

    // Try to recover from raw tokens if costCents is missing or 0.
    const model = typeof p.model === "string" ? p.model : null;
    const inputTokens =
      typeof p.inputTokens === "number" ? p.inputTokens : null;
    const outputTokens =
      typeof p.outputTokens === "number" ? p.outputTokens : null;
    if (model && inputTokens !== null && outputTokens !== null) {
      const matchedKey = (Object.keys(MODEL_PRICING) as (keyof typeof MODEL_PRICING)[]).find(
        (k) => model === k || model.startsWith(k),
      );
      if (matchedKey) {
        const price = MODEL_PRICING[matchedKey];
        const cents =
          (inputTokens / 1_000_000) * price.inputPerM +
          (outputTokens / 1_000_000) * price.outputPerM;
        return Math.round(cents);
      }
    }
    if (stored === 0) return 0; // explicit 0 with no tokens — leave it
  }
  if (agent === "STRATEGIST") return AVG_EVENT_COST_CENTS.STRATEGIST;
  if (agent === "ECHO" && eventType === "draft_created")
    return AVG_EVENT_COST_CENTS.ECHO_DRAFT;
  if (agent === "ECHO" && eventType === "draft_regenerated")
    return AVG_EVENT_COST_CENTS.ECHO_REGENERATE;
  if (agent === "SCOUT") return AVG_EVENT_COST_CENTS.SCOUT_SWEEP;
  if (agent === "PULSE") return AVG_EVENT_COST_CENTS.PULSE_SWEEP;
  if (agent === "SIGNAL" && eventType === "sms_handled")
    return AVG_EVENT_COST_CENTS.SIGNAL_SMS;
  if (eventType === "image_generated") {
    if (payload && typeof payload === "object") {
      const p = payload as Record<string, unknown>;
      if (typeof p.costCents === "number") return Math.round(p.costCents);
    }
    return 1; // Flux Schnell default
  }
  return 0;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toFixed(2)}`;
}

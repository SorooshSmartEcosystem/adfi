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

// Twilio US pricing
export const TWILIO_CENTS = {
  localNumberMonthly: 100, // $1.00
  outboundSms: 0.75, // ~$0.0075 per segment
  inboundSms: 0.75,
  campaignRegistration: 1000, // $10 one-time
};

// Plan prices — placeholders. Wire Stripe price IDs to these when billing
// goes live. Gross margin calculations use these as MRR per active user.
export const PLAN_PRICING_CENTS = {
  SOLO: 4900, // $49/mo
  TEAM: 9900, // $99/mo
  STUDIO: 19900, // $199/mo
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
export function estimateEventCostCents(
  eventType: string,
  agent: string,
  payload?: unknown,
): number {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.costCents === "number") return Math.round(p.costCents);
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
  return 0;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toFixed(2)}`;
}

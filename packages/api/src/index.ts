export { appRouter, type AppRouter } from "./routers";
export { createContext, type Context } from "./context";
export { OrbError } from "./errors";
export { router, publicProc, authedProc, adminProc } from "./trpc";

// Agents (invoked from webhooks, edge functions, and internal orchestration)
export { runStrategist, type BrandVoice } from "./agents/strategist";
export {
  runSignal,
  processInboundSms,
  type SignalOutput,
} from "./agents/signal";
export {
  runEcho,
  generateDailyContent,
  regenerateDraftContent,
  type EchoOutput,
} from "./agents/echo";
export {
  runScout,
  generateCompetitorIntel,
  type ScoutOutput,
} from "./agents/scout";
export {
  runPulse,
  generatePulseSignals,
  type PulseOutput,
} from "./agents/pulse";

// Service helpers (used by webhook route handlers in apps/web)
export {
  sendSms,
  validateTwilioSignature,
} from "./services/twilio";

// Cron orchestration (invoked by /api/cron/* route handlers)
export {
  runAgentForAllEligibleUsers,
  type CronRunResult,
} from "./cron";

// Pricing + cost estimation (used by admin financial reports)
export {
  MODEL_PRICING,
  AVG_EVENT_COST_CENTS,
  TWILIO_CENTS,
  PLAN_PRICING_CENTS,
  FIXED_OVERHEAD_CENTS,
  estimateAnthropicCostCents,
  estimateEventCostCents,
  formatCents,
} from "./services/pricing";

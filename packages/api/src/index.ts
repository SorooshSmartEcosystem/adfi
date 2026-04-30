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
  draftPlanItem,
  type EchoOutput,
} from "./agents/echo";
export {
  runPlanner,
  generateWeeklyPlan,
  startOfWeek,
  type PlannerOutput,
} from "./agents/planner";
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

// Service helpers (used by webhook + cron route handlers in apps/web)
export { recordAnthropicUsage } from "./services/anthropic";
export {
  PLAN_LIMITS,
  CREDIT_COSTS,
  periodFor,
  nextResetAt,
  type PlanKey,
  type UsageInfo,
} from "./services/quota";
export {
  summarizePerformance,
  performanceForPrompt,
  type PerformanceSummary,
} from "./services/performance";
export {
  sendSms,
  validateTwilioSignature,
} from "./services/twilio";
export {
  stripe,
  priceIdForPlan,
  planForPriceId,
  PLAN_PRICES_CENTS,
} from "./services/stripe";

// Cron orchestration (invoked by /api/cron/* route handlers)
export {
  runAgentForAllEligibleUsers,
  type CronRunResult,
} from "./cron";

// Pricing + cost estimation (used by admin financial reports)
export {
  MODEL_PRICING,
  AVG_EVENT_COST_CENTS,
  BRAND_KIT_GENERATION_CENTS,
  VAPI_CENTS,
  TWILIO_CENTS,
  PLAN_PRICING_CENTS,
  FIXED_OVERHEAD_CENTS,
  estimateAnthropicCostCents,
  estimateEventCostCents,
  formatCents,
} from "./services/pricing";

export {
  getSavedPreview,
  type OnboardingPreviewResult,
} from "./services/onboarding-preview";

export {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  extendToken,
  listPages,
  subscribePageWebhook,
  listSubscribedApps,
  sendMessengerReply,
  getMessengerProfile,
  verifyWebhookSignature,
  verifySignedRequest,
  type MetaPage,
} from "./services/meta";

export { encryptToken, decryptToken } from "./services/crypto";

export {
  getMe as getTelegramBotIdentity,
  getChat as getTelegramChat,
  setWebhook as setTelegramWebhook,
  deleteWebhook as deleteTelegramWebhook,
  sendMessage as sendTelegramMessage,
  sendTypingAction as sendTelegramTypingAction,
  buildWebhookUrl as buildTelegramWebhookUrl,
  type TelegramBotIdentity,
  type TelegramChat,
} from "./services/telegram";

export {
  processInboundMessenger,
  processInboundTelegram,
} from "./agents/signal";

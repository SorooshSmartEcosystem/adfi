import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_SOLO: z.string().startsWith("price_"),
  STRIPE_PRICE_TEAM: z.string().startsWith("price_"),
  STRIPE_PRICE_STUDIO: z.string().startsWith("price_"),

  TWILIO_ACCOUNT_SID: z.string().startsWith("AC"),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_API_KEY: z.string().startsWith("SK").optional(),
  TWILIO_API_SECRET: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().startsWith("MG"),
  TWILIO_PHONE_NUMBER_POOL: z.string().optional(),

  VAPI_API_KEY: z.string().min(1),
  VAPI_ASSISTANT_TEMPLATE_ID: z.string().min(1),
  VAPI_WEBHOOK_SECRET: z.string().min(1),

  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  ANTHROPIC_MODEL_OPUS: z.string().default("claude-opus-4-7"),
  ANTHROPIC_MODEL_SONNET: z.string().default("claude-sonnet-4-6"),
  ANTHROPIC_MODEL_HAIKU: z.string().default("claude-haiku-4-5"),

  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  META_WEBHOOK_APP_SECRET: z.string().min(1),

  ADMIN_URL: z.string().url(),

  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  TOKEN_ENCRYPTION_KEY: z.string().min(32),

  CRON_SECRET: z.string().min(16).optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DISABLE_WEBHOOKS: z.enum(["0", "1"]).default("0"),
  MOCK_LLM: z.enum(["0", "1"]).default("0"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid server environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid server environment — see above");
}

export const env = parsed.data;
export type ServerEnv = typeof env;

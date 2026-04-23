# ENVIRONMENT.md

Every environment variable the ORB monorepo uses. If you add a new one, add it here first.

## How env vars are organized

We use three scopes:

- **Root `.env.local`** — everything needed for local development. Git-ignored. Copied from `.env.example`.
- **App-specific `.env.local`** — each app can override. Not usually needed; most vars live at root.
- **Deployed envs (Vercel, EAS)** — set via the platform dashboard. Never commit production secrets.

Next.js rules:

- Vars prefixed with `NEXT_PUBLIC_*` are exposed to the browser. Everything else stays server-side.
- Mobile (Expo) reads vars prefixed with `EXPO_PUBLIC_*` at build time.

## The variables

### Core database & auth

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `DATABASE_URL` | Server | Supabase dashboard → Settings → Database → Connection string (Transaction mode) | Used by Prisma client at runtime. Includes `?pgbouncer=true` for connection pooling. |
| `DIRECT_URL` | Server | Supabase dashboard → Settings → Database → Connection string (Session mode) | Used by Prisma for migrations. Bypasses pooler. |
| `SUPABASE_URL` | Server | Supabase dashboard → Settings → API | Also exposed as `NEXT_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_URL`. |
| `SUPABASE_ANON_KEY` | Server | Supabase dashboard → Settings → API | Also exposed as public to mobile/web. Safe to expose — RLS enforces security. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase dashboard → Settings → API | **NEVER expose to client.** Bypasses RLS. Backend only. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Same as `SUPABASE_URL` | For Next.js web + admin clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Same as `SUPABASE_ANON_KEY` | For Next.js web + admin clients. |
| `EXPO_PUBLIC_SUPABASE_URL` | Client | Same as `SUPABASE_URL` | For mobile app. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client | Same as `SUPABASE_ANON_KEY` | For mobile app. |

### Stripe

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `STRIPE_SECRET_KEY` | Server | Stripe dashboard → Developers → API keys | Use test keys (`sk_test_...`) in dev, live keys in production. |
| `STRIPE_WEBHOOK_SECRET` | Server | Stripe dashboard → Developers → Webhooks → your endpoint | Different per webhook endpoint. Rotate if exposed. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Stripe dashboard → Developers → API keys | Safe to expose. Use test/live pair matching `STRIPE_SECRET_KEY`. |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Same as above | Mirror for mobile. |
| `STRIPE_PRICE_SOLO` | Server | Stripe dashboard → Products → Solo → Pricing | The Price ID (starts with `price_`), not the Product ID. |
| `STRIPE_PRICE_TEAM` | Server | Same, for Team | |
| `STRIPE_PRICE_STUDIO` | Server | Same, for Studio | |

### Twilio

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `TWILIO_ACCOUNT_SID` | Server | Twilio console → dashboard | Starts with `AC...` |
| `TWILIO_AUTH_TOKEN` | Server | Twilio console → dashboard | Rotatable. Rotate immediately if exposed. |
| `TWILIO_API_KEY` | Server | Twilio console → Account → API keys | Preferred over auth token for production; scopable. |
| `TWILIO_API_SECRET` | Server | Shown once when creating the API key | Save immediately; can't be retrieved later. |
| `TWILIO_MESSAGING_SERVICE_SID` | Server | Twilio console → Messaging → Services | Used for outbound SMS. Starts with `MG...` |
| `TWILIO_PHONE_NUMBER_POOL` | Server | Comma-separated list of numbers you own (optional) | For dev, can hardcode; for production, Twilio programmatically searches inventory. |

### Vapi

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `VAPI_API_KEY` | Server | Vapi dashboard → API keys | Private key. |
| `VAPI_ASSISTANT_TEMPLATE_ID` | Server | Created manually once; ID stored here | The base Vapi Assistant config; we customize per-user at call time. |
| `VAPI_WEBHOOK_SECRET` | Server | Vapi dashboard → webhook settings | For verifying incoming webhooks. |

### Anthropic (Claude)

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `ANTHROPIC_API_KEY` | Server | https://console.anthropic.com/ | Starts with `sk-ant-`. |
| `ANTHROPIC_MODEL_OPUS` | Server | Model identifier | Default: `claude-opus-4-7` |
| `ANTHROPIC_MODEL_SONNET` | Server | Model identifier | Default: `claude-sonnet-4-6` |
| `ANTHROPIC_MODEL_HAIKU` | Server | Model identifier | Default: `claude-haiku-4-5-20251001` |

Putting model names in env vars lets us swap models via config without a code deploy.

### Meta (Instagram / Facebook)

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `META_APP_ID` | Server | Meta Developer dashboard → your app | Also exposed publicly. |
| `META_APP_SECRET` | Server | Meta Developer dashboard → your app | Never expose. Used for token exchange. |
| `NEXT_PUBLIC_META_APP_ID` | Client | Same as `META_APP_ID` | For OAuth redirect URLs. |
| `EXPO_PUBLIC_META_APP_ID` | Client | Same | Mobile OAuth. |
| `META_WEBHOOK_VERIFY_TOKEN` | Server | You define this | Random string you set in Meta dashboard. |
| `META_WEBHOOK_APP_SECRET` | Server | Same as `META_APP_SECRET` | For validating webhook signatures. |

### App URLs

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `NEXT_PUBLIC_WEB_URL` | Client | You set it | e.g., `http://localhost:3000` in dev, `https://orb.com` in prod. |
| `NEXT_PUBLIC_APP_SCHEME` | Client | You set it | Deep link scheme, e.g., `orb://`. |
| `ADMIN_URL` | Server | You set it | e.g., `https://admin.orb.com`. Used by admin-only email links. |

### Observability

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `SENTRY_DSN` | Server | Sentry project settings → Client keys | Same DSN for all three apps, different `environment` tag. |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | Same as above | |
| `EXPO_PUBLIC_SENTRY_DSN` | Client | Same | |
| `SENTRY_AUTH_TOKEN` | Server | Sentry → settings → auth tokens | For uploading sourcemaps during build. |
| `POSTHOG_API_KEY` | Client | PostHog project settings | Used for both web/admin/mobile. |
| `POSTHOG_HOST` | Client | Usually `https://us.i.posthog.com` | |

### Encryption

| Variable | Scope | Where to get | Notes |
|----------|-------|--------------|-------|
| `TOKEN_ENCRYPTION_KEY` | Server | Generate: `openssl rand -base64 32` | Used to encrypt OAuth tokens at rest. **DO NOT rotate without a migration script to re-encrypt existing data.** |

### Dev-only

| Variable | Scope | When needed | Notes |
|----------|-------|-------------|-------|
| `NODE_ENV` | Server | Set automatically by Next.js / Expo | Don't set manually. |
| `LOG_LEVEL` | Server | Optional | `debug`, `info`, `warn`, `error`. Default `info` in dev, `warn` in prod. |
| `DISABLE_WEBHOOKS` | Server | Optional | If set to `1`, webhooks return 200 without processing. Useful for local dev when Stripe/Twilio can't reach your localhost. |
| `MOCK_LLM` | Server | Optional | If set to `1`, Claude calls return fixture data from `packages/api/src/agents/__fixtures__/`. Dev-only. |

## The `.env.example` file

This file lives at the repo root, committed to git. It's the template developers copy to `.env.local`. Never put real secrets in it.

```bash
# .env.example
# Copy to .env.local and fill in real values.
# Never commit .env.local to git.

# =============================================================
# SUPABASE (database + auth + storage)
# =============================================================
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# Client-facing mirrors (safe to expose — RLS enforces security)
NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
EXPO_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"
EXPO_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"

# =============================================================
# STRIPE (payments + billing)
# =============================================================
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Price IDs (create three products in Stripe dashboard first)
STRIPE_PRICE_SOLO="price_..."
STRIPE_PRICE_TEAM="price_..."
STRIPE_PRICE_STUDIO="price_..."

# =============================================================
# TWILIO (phone + SMS)
# =============================================================
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN=""
TWILIO_API_KEY="SK..."
TWILIO_API_SECRET=""
TWILIO_MESSAGING_SERVICE_SID="MG..."
TWILIO_PHONE_NUMBER_POOL=""

# =============================================================
# VAPI (voice AI)
# =============================================================
VAPI_API_KEY=""
VAPI_ASSISTANT_TEMPLATE_ID=""
VAPI_WEBHOOK_SECRET=""

# =============================================================
# ANTHROPIC (LLM)
# =============================================================
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL_OPUS="claude-opus-4-7"
ANTHROPIC_MODEL_SONNET="claude-sonnet-4-6"
ANTHROPIC_MODEL_HAIKU="claude-haiku-4-5-20251001"

# =============================================================
# META (Instagram + Facebook)
# =============================================================
META_APP_ID=""
META_APP_SECRET=""
NEXT_PUBLIC_META_APP_ID="${META_APP_ID}"
EXPO_PUBLIC_META_APP_ID="${META_APP_ID}"
META_WEBHOOK_VERIFY_TOKEN=""
META_WEBHOOK_APP_SECRET="${META_APP_SECRET}"

# =============================================================
# APP URLS
# =============================================================
NEXT_PUBLIC_WEB_URL="http://localhost:3000"
NEXT_PUBLIC_APP_SCHEME="orb://"
ADMIN_URL="http://localhost:3001"

# =============================================================
# OBSERVABILITY
# =============================================================
SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_DSN="${SENTRY_DSN}"
EXPO_PUBLIC_SENTRY_DSN="${SENTRY_DSN}"
SENTRY_AUTH_TOKEN=""
POSTHOG_API_KEY=""
POSTHOG_HOST="https://us.i.posthog.com"

# =============================================================
# ENCRYPTION
# Generate with: openssl rand -base64 32
# =============================================================
TOKEN_ENCRYPTION_KEY=""

# =============================================================
# DEV-ONLY (optional)
# =============================================================
LOG_LEVEL="debug"
# DISABLE_WEBHOOKS=1
# MOCK_LLM=1
```

## Setting env vars in deployment

### Vercel (web + admin)

1. Go to project → Settings → Environment Variables
2. Paste each var with appropriate environment scope (Production / Preview / Development)
3. For secrets, mark as "Sensitive" so they're not shown after saving
4. Redeploy for changes to take effect

### EAS (mobile)

1. Create `eas.json` with `env` blocks for `development`, `preview`, and `production`
2. Or use `eas secret:create` for truly sensitive values
3. Vars prefixed with `EXPO_PUBLIC_*` are baked into the JS bundle at build time

### Supabase Edge Functions

1. `supabase secrets set KEY=value` via CLI
2. Vars are available via `Deno.env.get('KEY')` inside edge functions
3. Service role key is auto-available, no need to set explicitly

## Validating at startup

Every app validates its required env vars on boot. This prevents the app from deploying and then crashing on first request.

```ts
// packages/config/src/env.ts
import { z } from 'zod';

const serverEnv = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  TOKEN_ENCRYPTION_KEY: z.string().min(32),
  // ... all required server vars
});

const result = serverEnv.safeParse(process.env);
if (!result.success) {
  console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
  throw new Error('Invalid environment — see above');
}

export const env = result.data;
```

All app code imports from `@orb/config/env`, never reads `process.env` directly. This catches typos at startup instead of runtime.

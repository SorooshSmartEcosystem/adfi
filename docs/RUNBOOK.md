# RUNBOOK.md

Day-to-day operations for working in this repo. Keep this doc open while you're coding.

## Local development

### First-time setup (once per machine)

```bash
# 1. Install prerequisites (if you haven't)
nvm install 20
nvm use 20
npm install -g pnpm eas-cli

# 2. Clone the repo
git clone <repo-url> orb
cd orb

# 3. Install dependencies
pnpm install

# 4. Copy env template
cp .env.example .env.local

# 5. Fill in .env.local (see docs/ENVIRONMENT.md for what each var means)
# At minimum you need: Supabase, Stripe (test), Anthropic.
# Twilio/Vapi/Meta can be empty until you need them — code will detect and skip.

# 6. Set up the database
pnpm db:generate    # generates Prisma client
pnpm db:migrate     # creates tables in your Supabase DB
pnpm db:seed        # loads test data (optional)

# 7. Start everything
pnpm dev
```

After `pnpm dev` you should see:

- Web: http://localhost:3000
- Admin: http://localhost:3001
- Mobile: Expo QR code in terminal — scan with your phone or press `i` for iOS simulator

### Daily workflow

```bash
# Pull latest
git pull

# If dependencies changed, reinstall
pnpm install

# If DB schema changed, apply migrations
pnpm db:migrate

# Start working
pnpm dev
```

### Running a single app

```bash
pnpm --filter @orb/web dev       # just web (includes tRPC API)
pnpm --filter @orb/admin dev     # just admin
pnpm --filter @orb/mobile dev    # just mobile
```

For mobile, web must also be running (mobile calls the tRPC API at `localhost:3000`).

### Local webhooks (Stripe, Twilio, etc.)

Third parties can't reach `localhost:3000` directly. Use `ngrok` or `cloudflared`:

```bash
# Option 1: ngrok (simplest)
brew install ngrok
ngrok http 3000
# Copy the HTTPS URL it gives you, configure in Stripe/Twilio dashboards

# Option 2: cloudflared (no signup)
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

Then in Stripe CLI for webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

For Twilio webhooks, configure the webhook URL in the Twilio console to your ngrok URL. Clean up when done — Twilio will keep sending to a dead ngrok URL otherwise.

## Database operations

### Applying migrations

```bash
# Development — creates migration + applies
pnpm db:migrate

# Production — applies existing migrations only, never creates
pnpm db:migrate:deploy
```

### Creating a migration

```bash
# 1. Edit packages/db/prisma/schema.prisma
# 2. Run migrate dev to generate + apply
cd packages/db
npx prisma migrate dev --name descriptive_name

# Example names: add_appointment_notes, drop_unused_index, change_plan_default
```

### Resetting local DB

```bash
# Wipes all data, reapplies all migrations, reseeds
pnpm db:reset
```

### Prisma Studio (visual DB browser)

```bash
pnpm db:studio
# Opens at http://localhost:5555
```

### Production DB access

Don't SSH into production DB for anything except emergencies. Use the Supabase dashboard SQL editor for reads. For writes, open a PR with a migration.

## Deploying

### Web + Admin (Vercel)

Every push to `main` branch deploys to production automatically. Every PR gets a preview deployment.

Manual deploy:

```bash
pnpm --filter @orb/web vercel --prod
pnpm --filter @orb/admin vercel --prod
```

### Mobile (EAS)

```bash
# Build for TestFlight (internal testing)
pnpm --filter @orb/mobile eas build --platform ios --profile preview

# Build for App Store
pnpm --filter @orb/mobile eas build --platform ios --profile production
pnpm --filter @orb/mobile eas submit --platform ios

# OTA update (small JS/asset changes only — no native changes)
pnpm --filter @orb/mobile eas update --branch production --message "Fix amber card color"
```

OTA updates work for anything that doesn't touch native code. If you add a native dependency or change `app.config.ts` in ways that affect the binary, you need a fresh build + App Store review.

### Database (Supabase)

Migrations apply automatically in CI on merge to `main`. Manual deploy (only if you need to fix CI):

```bash
pnpm db:migrate:deploy
```

## Common issues

### "Cannot find module '@orb/api'" after adding a workspace package

Packages need a build step. From repo root:

```bash
pnpm --filter @orb/api build
# or build everything
pnpm build
```

If that doesn't fix it, clear Turbo cache:

```bash
pnpm turbo clean
pnpm install
```

### Metro bundler fails with "Unable to resolve module"

The mobile bundler sometimes caches stale paths when you add a new workspace package.

```bash
cd apps/mobile
npx expo start --clear
```

If that doesn't work, nuke `node_modules`:

```bash
# From repo root
pnpm clean  # runs rm -rf node_modules in every package
pnpm install
pnpm --filter @orb/mobile start --clear
```

### Prisma client out of date

After editing `schema.prisma`:

```bash
pnpm db:generate
```

If TypeScript still complains, restart your editor's TypeScript server. In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server".

### Supabase RLS is blocking a legitimate query

You're probably using the anon key when you should be using the service role key (or vice versa). Rules:

- **Client code** (mobile, browser) → anon key. RLS is enforced.
- **Server code** (tRPC procedures, webhooks, edge functions) → service role key. RLS is bypassed; you filter manually.

If a tRPC procedure tries to read a user's data but returns empty, check `packages/api/src/context.ts` — it should create the Supabase client with the service role key, then your procedure filters by `ctx.userId`.

### Stripe webhook verification fails locally

You need the webhook secret from `stripe listen` (not from the dashboard). The CLI prints:

```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Put `whsec_xxx` in your `.env.local` as `STRIPE_WEBHOOK_SECRET`. The dashboard's secret is for production only.

### Twilio inbound SMS not working locally

Check these in order:

1. Is ngrok running? `curl <your-ngrok-url>/api/webhooks/twilio/sms` should return 400 (expected — no valid Twilio signature).
2. Is the webhook URL configured in Twilio console? Phone Numbers → your number → "A message comes in" webhook.
3. Is the signature check failing? Check Sentry. In dev, temporarily set `DISABLE_WEBHOOKS=1` to bypass signature check and see if the handler itself works.

### Expo QR code doesn't work on my phone

Make sure your phone and computer are on the same Wi-Fi network. If using a corporate network that blocks peer connections, try:

```bash
pnpm --filter @orb/mobile start --tunnel
```

This routes through Expo's servers. Slower but works across networks.

## Adding a new feature

Rough sequence:

### 1. Plan

Before writing code, answer:
- What tRPC route(s) will this need? Add them to `docs/API.md` first.
- Does it need new DB tables/columns? Update `docs/DATABASE.md` first.
- Any new env vars? Add them to `docs/ENVIRONMENT.md` first.
- Does it touch any of the six agents? Which prompts need updating?

If the feature is big, write a short spec in a GitHub issue or Notion doc.

### 2. Database changes (if any)

```bash
# Edit packages/db/prisma/schema.prisma
cd packages/db
npx prisma migrate dev --name add_feature_x
```

### 3. API changes

```bash
# Edit packages/api/src/routers/<domain>.ts
# Add Zod input schema, procedure, and return type
```

Write a quick test in `<domain>.test.ts`.

### 4. UI changes

For mobile: edit `apps/mobile/app/<route>/<screen>.tsx`.
For web: edit `apps/web/app/<route>/page.tsx`.

Use `packages/ui/tokens.ts` for all colors and spacing. Never hardcode.

### 5. Update CHANGELOG

Add a line under `[Unreleased]` describing the user-visible change in plain English.

### 6. Commit

```bash
git checkout -b feature/add-feature-x
git add .
git commit -m "feat(content): add feature x

Why this change: <why>

Changes:
- packages/db: added table y
- packages/api: new route content.getX
- apps/mobile: new screen for x"
```

### 7. Open PR

Request review from yourself (if solo) or team. See CONTRIBUTING.md for PR conventions.

## Debugging the agents

### Strategist (business analysis)

Triggered on onboarding completion. To re-run manually:

```bash
pnpm tsx scripts/run-agent.ts --agent strategist --user <user-id>
```

Output goes to `agent_context.strategist_output` and logs to `agent_events`.

If Strategist is producing garbage output: check the system prompt in `packages/api/src/agents/prompts/strategist.md`. Common issues: insufficient user context loaded (check `ctx.businessDescription`), or the model returning JSON in a wrapped format (parse more leniently).

### Scout (competitor tracking)

Runs weekly via pg_cron. To test locally:

```bash
pnpm tsx scripts/run-agent.ts --agent scout --user <user-id>
```

### Pulse (trends)

Runs daily. To test:

```bash
pnpm tsx scripts/run-agent.ts --agent pulse --user <user-id>
```

### Echo (content creation)

Runs daily to generate drafts. To test:

```bash
# Generate one draft for a user
pnpm tsx scripts/run-agent.ts --agent echo --user <user-id> --platform instagram
```

If Echo is producing off-voice content: check `agent_context.voice_fingerprint`. If it's empty, Strategist didn't complete — run Strategist first.

### Signal (calls, messages)

Signal runs reactively, not on a schedule. To test a call flow:

```bash
# Simulates an inbound call webhook
pnpm tsx scripts/simulate.ts --event inbound-call --user <user-id> --from +14165550199
```

For real Vapi testing: dial the user's ORB number from a different phone. Check the Vapi dashboard for the call transcript and our `calls` table for the recorded event.

## Monitoring production

### Error rates

Sentry dashboard → orb project. Alert thresholds:

- Mobile: > 1% error rate over 5 min → page
- Web/API: > 0.5% error rate over 5 min → page
- Any 500-level spike → page

### Agent health

Admin panel → Agents section. Shows:

- Success rate per agent per day
- Average runtime per agent
- Failed runs with error messages

If an agent's success rate drops below 95%, investigate.

### Queue depth

If we move to a dedicated worker (Railway), monitor queue depth. For v1 (Supabase Edge Functions), pg_cron stats are in Supabase dashboard → Database → Extensions → pg_cron.

### Twilio health

Twilio console → Monitor → Alerts. Set up email alerts for:

- Error rate > 2% over 15 min
- Any number with > 10 failed calls in an hour

### Stripe health

Stripe dashboard → Developers → Events. Watch for:

- `invoice.payment_failed` spike — means cards are declining
- `customer.subscription.deleted` spike — means churn event

## Incident response

### Mobile app crashes in production

1. Check Sentry for the crash signature
2. If it's a JS error (not a native crash), you can fix via OTA update in minutes:
   ```bash
   # Make the fix, commit, then:
   pnpm --filter @orb/mobile eas update --branch production --message "Emergency fix for X"
   ```
3. If it's a native crash, you need a new build + App Store review (~24-48h for expedited review)
4. Update CHANGELOG with the fix

### API is down

1. Check Vercel dashboard for deployment status
2. If last deploy is failing, rollback:
   ```bash
   # In Vercel dashboard: Deployments → previous successful → Promote to Production
   ```
3. If Vercel is healthy but API errors, check:
   - Supabase status (https://status.supabase.com)
   - DB connection limits (Supabase dashboard → Database → Pooler)
   - Rate limits on LLM/Twilio/Stripe

### Data issue in production

1. **Never** write raw SQL in production without a migration unless it's genuinely an emergency
2. Preferred path: write a one-off script in `scripts/emergency/` that makes the change, get it reviewed, run it with logs
3. If you must hotfix: Supabase dashboard → SQL editor → run the fix → screenshot everything → write a postmortem

### User can't sign up / onboard

The most common support issue. Debug sequence:

1. Ask for their phone/email
2. Admin panel → Users → search
3. Check their row in `users` — at what step did they stop?
4. If their onboarding is stuck on `runAnalysis`: check `agent_events` for `analysis_started` without matching `analysis_complete` — likely Claude API timeout, re-enqueue
5. If stuck on `provisionPhone`: check Twilio response in logs — often a geographical restriction

## Useful scripts

```bash
pnpm scripts/count-users.ts              # how many active users
pnpm scripts/migrate-voice-fingerprints  # one-off migrations go in scripts/
pnpm scripts/check-env-vars.ts           # validate all required env vars are set
pnpm scripts/run-agent.ts                # manually trigger any agent
pnpm scripts/simulate.ts                 # simulate webhooks for testing
```

## When you get stuck

1. Search this doc for keywords
2. Search the codebase for similar patterns — there's usually prior art
3. Check Sentry for recent errors that might be related
4. Ask Claude Code — tell it the full context in one prompt, including which files you've already looked at
5. If still stuck, write down what you've tried in a note, sleep on it. Hard bugs usually fall in the shower.

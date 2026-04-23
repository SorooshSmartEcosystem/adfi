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
git clone <repo-url> adfi
cd adfi

# 3. Install dependencies
pnpm install

# 4. Copy env template
cp .env.example .env.local

# 5. Fill in .env.local (see docs/ENVIRONMENT.md for what each var means)
# At minimum you need: Supabase, Stripe (test), Anthropic.

# 6. Set up the database
pnpm db:generate    # generates Prisma client
pnpm db:migrate     # creates tables in your Supabase DB
pnpm db:seed        # loads test data (optional)

# 7. Start everything
pnpm dev
```

After `pnpm dev` you should see:

- Web: http://localhost:3000 (API host)
- Admin: http://localhost:3001
- Mobile: Expo QR code in terminal — scan with your phone, or press `i` for iOS simulator, `a` for Android emulator

### Daily workflow

```bash
git pull
pnpm install              # if dependencies changed
pnpm db:migrate           # if DB schema changed
pnpm dev
```

### Running a single app

```bash
pnpm --filter @orb/web dev              # just the API host
pnpm --filter @orb/admin dev            # just admin
pnpm --filter @orb/mobile dev           # mobile (both platforms available)
pnpm --filter @orb/mobile ios           # iOS simulator only
pnpm --filter @orb/mobile android       # Android emulator only
```

### Local webhooks (Stripe, Twilio, etc.)

Third parties can't reach `localhost:3000` directly. Use `ngrok` or `cloudflared`:

```bash
brew install ngrok
ngrok http 3000
# Configure in Stripe/Twilio/Meta dashboards with the HTTPS URL ngrok gives you
```

For Stripe webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Database operations

### Applying migrations

```bash
pnpm db:migrate              # dev — creates + applies
pnpm db:migrate:deploy       # production — applies existing only
```

### Creating a migration

```bash
cd packages/db
npx prisma migrate dev --name descriptive_name
```

Descriptive names: `add_appointment_notes`, `drop_unused_index`, `change_plan_default`. Not `update_schema`.

### Resetting local DB

```bash
pnpm db:reset      # wipes all data, reapplies migrations, reseeds
```

### Prisma Studio (visual DB browser)

```bash
pnpm db:studio     # opens at http://localhost:5555
```

### Production DB access

Don't SSH into production DB for anything except emergencies. Use the Supabase dashboard SQL editor for reads. For writes, open a PR with a migration.

## Deploying

### Web API + Admin (Vercel)

Every push to `main` branch auto-deploys both to production. Every PR gets a preview deployment.

Production URLs:
- Web/API: `api.adfi.ca` (or `app.adfi.ca` if we add a web version of the app)
- Admin: `admin.adfi.ca` (password-protected)

Manual deploy:

```bash
pnpm --filter @orb/web vercel --prod
pnpm --filter @orb/admin vercel --prod
```

### Marketing site (adfi.ca)

The marketing site lives in a **separate project** (`adfi-landing/`), not in this monorepo. Deploying it is a separate action:

```bash
cd ~/projects/adfi-landing
git push origin main
# Vercel auto-deploys to adfi.ca
```

This intentional separation keeps marketing experiments decoupled from product releases.

### Mobile iOS

```bash
# Internal testing build (for TestFlight)
pnpm --filter @orb/mobile eas build --platform ios --profile preview

# Production build for App Store
pnpm --filter @orb/mobile eas build --platform ios --profile production
pnpm --filter @orb/mobile eas submit --platform ios

# OTA update (JS/asset changes only, no native changes)
pnpm --filter @orb/mobile eas update --branch production --message "Fix amber card color"
```

### Mobile Android

```bash
# Internal testing build (for Play Store internal track)
pnpm --filter @orb/mobile eas build --platform android --profile preview

# Production build for Play Store
pnpm --filter @orb/mobile eas build --platform android --profile production
pnpm --filter @orb/mobile eas submit --platform android

# OTA updates work the same for both platforms
pnpm --filter @orb/mobile eas update --branch production --message "..."
```

### Mobile — build for both at once

```bash
pnpm --filter @orb/mobile eas build --platform all --profile production
```

This kicks off parallel builds for iOS and Android. Build times differ — Android usually faster, iOS often bottlenecked by Apple's signing.

### Database (Supabase)

Migrations apply automatically in CI on merge to `main`. Manual deploy (only if CI breaks):

```bash
pnpm db:migrate:deploy
```

## Common issues

### "Cannot find module '@orb/api'" after adding a workspace package

```bash
pnpm --filter @orb/api build
# or
pnpm build
```

If that doesn't fix it:

```bash
pnpm turbo clean
pnpm install
```

### Metro bundler fails with "Unable to resolve module"

```bash
cd apps/mobile
npx expo start --clear
```

If that doesn't work, nuke `node_modules`:

```bash
# From repo root
pnpm clean  # rm -rf node_modules in every package
pnpm install
pnpm --filter @orb/mobile start --clear
```

### Prisma client out of date

```bash
pnpm db:generate
```

If TypeScript still complains, restart your editor's TypeScript server. VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server".

### Supabase RLS blocking a legitimate query

Usually using the anon key when you should be using the service role key (or vice versa):

- **Client code** (mobile, browser) → anon key. RLS is enforced.
- **Server code** (tRPC procedures, webhooks, edge functions) → service role key. RLS is bypassed; you filter manually.

### Stripe webhook verification fails locally

You need the webhook secret from `stripe listen` (not from the dashboard). The CLI prints:

```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Put `whsec_xxx` in `.env.local` as `STRIPE_WEBHOOK_SECRET`. The dashboard's secret is for production only.

### Twilio inbound SMS not working locally

1. Is ngrok running? Test with `curl <your-ngrok-url>/api/webhooks/twilio/sms` → expect 400.
2. Is the webhook URL configured in Twilio console? Phone Numbers → your number → "A message comes in" webhook.
3. Is the signature check failing? In dev, temporarily set `DISABLE_WEBHOOKS=1` to bypass.

### Expo QR code doesn't work on my phone

Same Wi-Fi network required. If corporate network blocks peer connections:

```bash
pnpm --filter @orb/mobile start --tunnel
```

Routes through Expo's servers. Slower but works across networks.

### Android-specific: "Unable to load script" on first run

Usually means Android emulator can't reach Metro bundler. Try:

```bash
adb reverse tcp:8081 tcp:8081
```

Then reload the app.

### Android-specific: Push notifications not working

1. Verify `google-services.json` exists in `apps/mobile/` (not committed; each dev has their own)
2. Verify Firebase Cloud Messaging is enabled in the Firebase Console
3. Check that the package name in `app.config.ts` matches your FCM sender ID config

### iOS-specific: Push notifications not working

1. Verify `GoogleService-Info.plist` exists in `apps/mobile/`
2. Check that your Apple Developer account has APNS credentials uploaded to Expo (via `eas credentials`)
3. Production push requires a production provisioning profile, not dev

## Adding a new feature

Rough sequence:

### 1. Plan

Before writing code, answer:
- What tRPC route(s) will this need? Add to `docs/API.md` first.
- Does it need new DB tables/columns? Update `docs/DATABASE.md` first.
- Any new env vars? Add to `docs/ENVIRONMENT.md` first.
- Does it touch any of the six agents? Which prompts need updating?
- Does it behave differently on iOS vs Android? Document platform-specific logic.

If the feature is big, write a short spec in a GitHub issue or Notion doc.

### 2. Database changes (if any)

```bash
cd packages/db
npx prisma migrate dev --name add_feature_x
```

### 3. API changes

Edit `packages/api/src/routers/<domain>.ts`. Add Zod input schema, procedure, return type. Write a quick test.

### 4. UI changes

For mobile: edit `apps/mobile/app/<route>/<screen>.tsx`.
For web/admin: edit the corresponding `apps/*/app/<route>/page.tsx`.

Use `packages/ui/src/tokens.ts` for all colors and spacing. Never hardcode.

For user-facing strings: say **ADFI**, not **ORB**.

### 5. Update CHANGELOG

Add a line under `[Unreleased]` describing the user-visible change in plain English.

### 6. Commit and PR

```bash
git checkout -b feature/add-feature-x
git add .
git commit -m "feat(content): add feature x"
```

See `docs/CONTRIBUTING.md` for commit conventions.

## Debugging the agents

Each agent can be triggered manually for testing. Scripts in `scripts/`:

```bash
pnpm tsx scripts/run-agent.ts --agent strategist --user <user-id>
pnpm tsx scripts/run-agent.ts --agent scout --user <user-id>
pnpm tsx scripts/run-agent.ts --agent pulse --user <user-id>
pnpm tsx scripts/run-agent.ts --agent echo --user <user-id> --platform instagram
pnpm tsx scripts/simulate.ts --event inbound-call --user <user-id> --from +14165550199
```

For real Vapi testing: dial the user's ADFI number from a different phone. Check the Vapi dashboard for the call transcript and our `calls` table for the recorded event.

## Monitoring production

### Error rates

Sentry dashboard → adfi project. Alert thresholds:

- Mobile (iOS + Android tracked separately): > 1% error rate over 5 min → page
- Web/API: > 0.5% error rate over 5 min → page
- Any 500-level spike → page

### Agent health

Admin panel → Agents section. Shows success rate, avg runtime, failed runs. If an agent drops below 95% success, investigate.

### Twilio health

Twilio console → Monitor → Alerts. Set up alerts for:
- Error rate > 2% over 15 min
- Any number with > 10 failed calls in an hour

### Stripe health

Watch for spikes in `invoice.payment_failed` (cards declining) and `customer.subscription.deleted` (churn).

## Incident response

### Mobile app crashes in production

1. Check Sentry for the crash signature
2. If JS error, hotfix via OTA update:
   ```bash
   pnpm --filter @orb/mobile eas update --branch production --message "Emergency fix for X"
   ```
3. If native crash, you need a new build + App Store / Play Store review. Both have expedited review options (~24-48h).

### Android native crashes

Check Google Play Console → Android Vitals for stack traces. Different from Sentry, sometimes has Android-specific info Sentry misses.

### iOS native crashes

Check App Store Connect → Analytics → Crashes. Same principle.

### API is down

1. Check Vercel dashboard for deployment status
2. If last deploy is failing, rollback via Vercel dashboard: Deployments → previous successful → Promote to Production
3. If Vercel is healthy but API errors, check Supabase status, DB connection limits, rate limits on LLM/Twilio/Stripe.

### Data issue in production

1. **Never** write raw SQL without a migration unless it's a genuine emergency
2. Preferred: write a one-off script in `scripts/emergency/`, get it reviewed, run with logs
3. Emergency hotfix: Supabase dashboard → SQL editor → fix → screenshot everything → write postmortem

### User can't sign up / onboard

Most common support issue:

1. Ask for their phone/email
2. Admin panel → Users → search
3. Check their row — at what step did they stop?
4. If stuck on `runAnalysis`: check `agent_events` for `analysis_started` without matching `analysis_complete` — likely Claude API timeout, re-enqueue
5. If stuck on `provisionPhone`: check Twilio response — often geographical restriction

## Useful scripts

```bash
pnpm scripts/count-users.ts
pnpm scripts/check-env-vars.ts
pnpm scripts/run-agent.ts
pnpm scripts/simulate.ts
```

## When you get stuck

1. Search this doc for keywords
2. Search the codebase for similar patterns — there's usually prior art
3. Check Sentry for recent errors that might be related
4. Ask Claude Code — full context in one prompt, including which files you've already looked at
5. If still stuck, write down what you've tried in a note, sleep on it. Hard bugs fall in the shower.

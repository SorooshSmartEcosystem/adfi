# HANDOFF — from planning to building

Everything is ready. This file tells you exactly what to do next to go from these docs to a running project in VS Code with Claude Code.

Read this end-to-end before starting. It should take 30-60 minutes to complete.

## Naming quick reference

- **Brand name (user-facing):** ADFI
- **Codename (internal, all code):** ORB
- **Website:** www.adfi.ca
- **Bundle identifier:** ca.adfi.mobile (iOS + Android)
- **Package names:** `@orb/api`, `@orb/db`, `@orb/ui`, `@orb/auth`, `@orb/config`

If you're writing code someone sees, say ADFI. If you're writing code someone imports, use orb.

## What you have right now

Documentation files:

- `README.md` → repo root
- `CLAUDE.md` → repo root (not inside `docs/`)
- `.env.example` → repo root
- `HANDOFF.md` → this file, root
- `ARCHITECTURE.md` → `docs/`
- `PROJECT_STRUCTURE.md` → `docs/`
- `DATABASE.md` → `docs/`
- `API.md` → `docs/`
- `ENVIRONMENT.md` → `docs/`
- `RUNBOOK.md` → `docs/`
- `SECURITY.md` → `docs/`
- `CONTRIBUTING.md` → `docs/`
- `CHANGELOG.md` → `docs/`

Plus the original clickable prototype: `ORB_Prototype_v6.html` → `prototype/`

## Step 1 — Create the project folder

```bash
cd ~/projects
mkdir adfi
cd adfi
mkdir docs prototype
git init
git branch -M main
```

## Step 2 — Copy the docs into place

```bash
# Replace <source> with the path where you saved these outputs
cp <source>/README.md adfi/
cp <source>/CLAUDE.md adfi/
cp <source>/.env.example adfi/
cp <source>/HANDOFF.md adfi/

cp <source>/ARCHITECTURE.md adfi/docs/
cp <source>/PROJECT_STRUCTURE.md adfi/docs/
cp <source>/DATABASE.md adfi/docs/
cp <source>/API.md adfi/docs/
cp <source>/ENVIRONMENT.md adfi/docs/
cp <source>/RUNBOOK.md adfi/docs/
cp <source>/SECURITY.md adfi/docs/
cp <source>/CONTRIBUTING.md adfi/docs/
cp <source>/CHANGELOG.md adfi/docs/

cp <source>/ORB_Prototype_v6.html adfi/prototype/
```

`CLAUDE.md` and `.env.example` at repo root, not inside `docs/`.

## Step 3 — Initial commit

```bash
cd adfi

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Builds
.next/
dist/
build/
*.log

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Expo
.expo/
dist/
web-build/

# Firebase configs (treat as secrets)
google-services.json
GoogleService-Info.plist

# Apple provisioning
*.mobileprovision
*.p12

# Typescript
*.tsbuildinfo
EOF

git add .
git commit -m "chore: initial project setup with docs"
```

## Step 4 — Install required tools

```bash
# Node.js 20+
node --version

# pnpm 9+
pnpm --version

# EAS CLI (for mobile builds — can defer until TestFlight)
eas --version

# Optional: Supabase CLI (helpful for local dev)
supabase --version
```

Install anything missing.

## Step 5 — Set up third-party accounts

Required for any code to run:
- [Supabase](https://supabase.com) — new project (free tier)
- [Anthropic Console](https://console.anthropic.com) — API key

Required before respective features:
- [Stripe](https://stripe.com) — test keys
- [Twilio](https://twilio.com) — one Canadian test number (since we're .ca)
- [Vapi](https://vapi.ai) — API key
- [Meta Developer](https://developers.facebook.com) — app + Instagram Business permissions request (6-8 week review — START EARLY)
- [Firebase](https://console.firebase.google.com) — for Android push notifications (FCM)

Observability (can defer to beta):
- [Sentry](https://sentry.io)
- [PostHog](https://posthog.com)

For v0 scaffolding: Supabase + Anthropic only.

## Step 6 — Fill in `.env.local`

```bash
cd adfi
cp .env.example .env.local
```

Edit `.env.local`. At minimum fill in: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_*`, `ANTHROPIC_API_KEY`. Leave others empty for now.

## Step 7 — Install Claude Code for VS Code

Open VS Code. Install the Claude Code extension via Extensions panel (search "Claude Code") or from [docs.claude.com](https://docs.claude.com/en/docs/claude-code/overview).

Sign in with Anthropic account. Open the project: `File → Open Folder → ~/projects/adfi`.

## Step 8 — The first prompt for Claude Code

Paste this into a Claude Code session:

```
I'm starting a new project. Before doing anything, please read these files
in order:

1. /CLAUDE.md
2. /README.md
3. /docs/ARCHITECTURE.md
4. /docs/PROJECT_STRUCTURE.md
5. /docs/DATABASE.md
6. /docs/API.md
7. /docs/ENVIRONMENT.md

After reading, confirm you understand:
(a) This is a monorepo with three apps (mobile for iOS + Android, web, admin)
    and five shared packages.
(b) The product thesis: solopreneurs HIRE the AI, they don't supervise it.
(c) The design principles: status over action, human words, detail opt-in.
(d) The stack: Expo, Next.js 15 App Router, tRPC v11, Prisma, Supabase,
    Anthropic SDK.
(e) The critical naming split: ADFI is the brand (user-facing strings);
    ORB is the codename (package names, variables). Don't mix them.
(f) Mobile targets BOTH iOS and Android from one Expo codebase.

Then show me a proposed file tree for the initial scaffold. Do NOT create
any files yet — wait for my approval.
```

## Step 9 — Approve the tree and scaffold

Once Claude Code proposes a tree, review it against `docs/PROJECT_STRUCTURE.md`. Then:

```
Tree looks right. Please scaffold in stages, stopping after each section
so I can confirm it builds:

1. pnpm workspace setup (package.json, pnpm-workspace.yaml, turbo.json,
   root tsconfig.json)
2. packages/config (shared eslint, tsconfig, tailwind presets)
3. packages/ui (design tokens from README.md — no components yet)
4. packages/db (Prisma schema from docs/DATABASE.md, client setup)
5. packages/auth (Supabase helpers)
6. packages/api (tRPC setup, context, stub routers)
7. apps/web (Next.js 15 App Router, tRPC route handler)
8. apps/admin (Next.js 15 App Router, auth-gated)
9. apps/mobile (Expo, tRPC client setup, splash screen matching prototype —
   configure for iOS + Android)

After each step, run `pnpm install` and `pnpm build` to confirm things
compile. If something breaks, fix before moving to next step.
```

## Step 10 — First run

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Expected:
- Web: http://localhost:3000
- Admin: http://localhost:3001
- Mobile: Expo QR → scan with phone (iOS or Android) or use simulator/emulator

If broken, share errors with Claude Code.

## What to build first (recommended order)

Once scaffold works, here's the build order. Each phase ~1-2 weeks.

### Phase 1 — Auth + onboarding (weeks 1-2)

1. Supabase Auth (phone OTP)
2. Onboarding step 1 (business description)
3. Onboarding step 2 (goal picker)
4. Onboarding step 3 (analysis moment — Claude Opus)
5. Onboarding step 4 (Stripe Payment Element + 3-tier selection + trial)
6. Onboarding step 5 (Twilio phone provisioning — CA number)
7. Onboarding step 6 (Meta OAuth for Instagram)

### Phase 2 — Home + basic agents (weeks 3-4)

1. Home screen with three states (day1, day3, steady)
2. Strategist agent (runs after onboarding)
3. Scout agent (weekly cron)
4. Needs-you detail screen (photo upload)

### Phase 3 — Signal (weeks 5-7)

Heavy flow. Budget plenty of time.

1. Twilio inbound SMS webhook → Signal handles and replies
2. Twilio call forwarding → Vapi for voice AI
3. Call transcript → extract intent → save to `calls`
4. Appointment booking
5. Signal mobile screens (live call, missed, convo, booked)
6. Inbox view
7. Push notifications (APNS on iOS, FCM on Android)

### Phase 4 — Echo (weeks 8-9)

1. Echo agent: draft generation pipeline
2. Instagram publishing via Meta Graph API
3. Composer screen
4. Calendar, performance, trends screens
5. Shadow mode (first 7 days)

### Phase 5 — Polish + launch prep (weeks 10-12)

1. Admin panel essentials
2. Error states everywhere
3. Empty states
4. Weekly report (Sunday SMS)
5. iOS App Store submission
6. Android Google Play submission (can lag by 1-4 weeks if needed)
7. Meta App Review (should have been started 2 months earlier)

Total: ~12 weeks solo, ~6-7 weeks with a partner.

## Prompts that save hours with Claude Code

### When Claude Code is stuck

```
Take a step back. What have you tried? List the files you've modified
in this attempt. Then propose a different approach.
```

### When you want a feature done right

```
I want to implement <feature>. Before writing code, please:

1. Read the relevant sections of docs/API.md and docs/DATABASE.md
2. Look at the prototype at prototype/ORB_Prototype_v6.html for UX reference
3. Propose the full plan: DB changes, tRPC routes, UI changes, tests
4. Wait for my approval

Only start coding after I approve the plan.
```

### When you want docs updated alongside code

```
When you're done with this feature, also update:
- docs/CHANGELOG.md under [Unreleased]
- docs/API.md if you added/changed routes
- docs/DATABASE.md if you changed the schema
```

### When reviewing Claude Code's work

```
Show me:
1. The file tree of what you created/changed
2. The key design decisions you made
3. Anything you weren't sure about
4. Whether any existing tests might fail
```

## Things you might forget

- **Meta app review takes 6-8 weeks.** Start BEFORE you build Instagram features.
- **Apple App Store review:** 1-3 days. Submit early TestFlight builds to learn.
- **Google Play review:** 1-3 days for updates, longer for new apps or policy-sensitive categories.
- **Twilio numbers cost ~$1-2/month each.** Keep test pool small.
- **LLM costs can spike fast with bugs.** Set usage alerts in Anthropic console.
- **Backup `.env.local`.** If you lose it and haven't saved to 1Password or similar, you'll spend hours regenerating secrets.
- **Firebase for Android** — you need this for push notifications to work. Set it up before Phase 3.

## Platform-specific setup you'll need eventually

### iOS

1. Apple Developer account ($99/year) — registered to you personally or your company
2. App Store Connect access — linked to your Developer account
3. Provisioning profiles and signing certificates — EAS handles these via `eas credentials`
4. APNS key or certificate — upload to Expo via `eas credentials`

### Android

1. Google Play Console account ($25 one-time)
2. Signed APK or AAB for Play Store — EAS generates
3. Firebase project — for FCM push notifications
4. `google-services.json` — download from Firebase Console, place in `apps/mobile/` (never commit)

## If you hit a dead end

You've got:
- Docs at `/docs` covering every major decision
- `CLAUDE.md` at root
- Original prototype for UX reference
- This session's memory (I remember the whole design journey)

If you get stuck in a way Claude Code can't resolve, come back to a chat session. Paste the specific error or decision.

When you return, start with: *"I'm working on ADFI. Here's where I am..."* and I can pick up.

## Final thoughts

You're at the inflection point between designing and building. The docs you have are substantially more thorough than most pre-launch SaaS. That's deliberate — good docs give you leverage during the build phase, especially with AI coding agents.

Two things to remember as you build:

1. **The product thesis is the north star.** When tradeoffs come up, ask "does this make ADFI more like a colleague, or more like a tool?" Pick colleague.

2. **Ship ugly before shipping perfect.** Get the six-agent pipeline running end-to-end with ugly UI first. Polish after you've proven it works.

And one more:

3. **iOS + Android from Day 1.** Don't let Android lag. Both are launch targets. If Android is 2 weeks behind iOS, fine. If it's 2 months behind, you've failed the commitment.

Go build it.

# HANDOFF — from planning to building

Everything is ready. This file tells you exactly what to do next to go from these docs to a running project in VS Code with Claude Code.

Read this end-to-end before starting. It should take 30-60 minutes to complete.

---

## What you have right now

11 documentation files in `orb-docs/`:

- `README.md` → repo root
- `CLAUDE.md` → repo root (not inside `docs/`)
- `.env.example` → repo root
- `ARCHITECTURE.md` → `docs/`
- `PROJECT_STRUCTURE.md` → `docs/`
- `DATABASE.md` → `docs/`
- `API.md` → `docs/`
- `ENVIRONMENT.md` → `docs/`
- `RUNBOOK.md` → `docs/`
- `SECURITY.md` → `docs/`
- `CONTRIBUTING.md` → `docs/`
- `CHANGELOG.md` → `docs/`

Plus the original clickable prototype: `ORB_Prototype_v5.html` → `prototype/`

---

## Step 1 — Create the project folder

On your machine:

```bash
# Pick a location you like
cd ~/projects     # or wherever you keep code

# Create the folder
mkdir orb
cd orb

# Create the basic structure
mkdir docs prototype

# Initialize git
git init
git branch -M main
```

---

## Step 2 — Copy the docs into place

From the folder where these outputs were saved, move files into your new project:

```bash
# Replace <source> with the path where these output files are
cp <source>/README.md orb/
cp <source>/CLAUDE.md orb/
cp <source>/.env.example orb/
cp <source>/HANDOFF.md orb/          # this file — keep for reference

cp <source>/ARCHITECTURE.md orb/docs/
cp <source>/PROJECT_STRUCTURE.md orb/docs/
cp <source>/DATABASE.md orb/docs/
cp <source>/API.md orb/docs/
cp <source>/ENVIRONMENT.md orb/docs/
cp <source>/RUNBOOK.md orb/docs/
cp <source>/SECURITY.md orb/docs/
cp <source>/CONTRIBUTING.md orb/docs/
cp <source>/CHANGELOG.md orb/docs/

# Copy the prototype from your earlier outputs
cp <wherever>/ORB_Prototype_v5.html orb/prototype/
```

**Double-check:** `CLAUDE.md` and `.env.example` go at repo **root**, not inside `docs/`. This matters — Claude Code expects `CLAUDE.md` at root.

---

## Step 3 — Initial commit

```bash
cd orb

# Create a basic .gitignore before committing
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

# Typescript
*.tsbuildinfo
EOF

git add .
git commit -m "chore: initial project setup with docs

Initial commit with complete documentation suite and reference prototype.
No code yet — next step is scaffolding via Claude Code."
```

Optional: create a GitHub repo and push.

```bash
# If you have the gh CLI
gh repo create orb --private --source=. --push

# Or manually: create on github.com, then
git remote add origin <your-repo-url>
git push -u origin main
```

---

## Step 4 — Install required tools

Verify you have these. Install anything missing:

```bash
# Node.js 20+
node --version    # should be v20.x or higher
# Install via nvm if needed: nvm install 20 && nvm use 20

# pnpm 9+
pnpm --version    # should be 9.x or higher
# Install: npm install -g pnpm

# EAS CLI (for mobile builds — can defer until you build for TestFlight)
eas --version
# Install: npm install -g eas-cli

# Optional: Supabase CLI (for local development, migrations)
supabase --version
# Install: brew install supabase/tap/supabase
```

---

## Step 5 — Set up required third-party accounts

Before you start coding, create accounts at:

**Required for any code to work:**
- [Supabase](https://supabase.com) — create a new project (free tier is fine)
- [Anthropic Console](https://console.anthropic.com) — create an API key

**Required for features that use them (can defer):**
- [Stripe](https://stripe.com) — create account, get test keys
- [Twilio](https://twilio.com) — create account, buy one test phone number
- [Vapi](https://vapi.ai) — create account, get API key
- [Meta Developer](https://developers.facebook.com) — create an app, apply for Instagram Business permissions (6-8 week review)

**Observability (can defer to beta):**
- [Sentry](https://sentry.io) — free tier
- [PostHog](https://posthog.com) — free tier

For v0 scaffolding, you only need Supabase + Anthropic. The rest can stay empty in your `.env.local`.

---

## Step 6 — Fill in `.env.local`

```bash
cd orb
cp .env.example .env.local

# Edit .env.local with real values
# At absolute minimum: DATABASE_URL, DIRECT_URL, SUPABASE_*, ANTHROPIC_API_KEY
# Leave other vars empty or with placeholder values for now
```

Reference `docs/ENVIRONMENT.md` for what each var means.

---

## Step 7 — Install Claude Code for VS Code

Open VS Code. Install the Claude Code extension.

Either:

- Search "Claude Code" in the Extensions panel, or
- [Claude Code for VS Code](https://docs.claude.com/en/docs/claude-code/overview)

Sign in with your Anthropic account. You'll need a Pro or Team subscription, or an API key with billing.

Open your project folder: `File → Open Folder → orb/`.

---

## Step 8 — The first prompt to Claude Code

This is the critical moment. Open a Claude Code session in your project and paste this prompt exactly:

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

After reading, confirm:

a) You understand this is a monorepo with three apps (mobile, web, admin)
   and five shared packages.
b) You understand the product thesis: solopreneurs HIRE ORB, they don't
   supervise it.
c) You understand the design principles: status over action, human words,
   detail opt-in.
d) You understand the stack: Expo, Next.js 15 App Router, tRPC v11,
   Prisma, Supabase, Anthropic SDK.

Then show me a proposed file tree for the initial scaffold. Do NOT create
any files yet. Wait for my approval of the tree.
```

Claude Code will read the docs and propose a file tree. Review it against `docs/PROJECT_STRUCTURE.md`. If anything is off, tell Claude Code to fix it.

Once the tree is right, approve with:

```
Tree looks right. Please scaffold everything. Do it in this order:

1. pnpm workspace setup (package.json, pnpm-workspace.yaml, turbo.json,
   tsconfig.json at root)
2. packages/config (shared eslint, tsconfig, tailwind presets)
3. packages/db (Prisma schema from docs/DATABASE.md, client setup)
4. packages/auth (Supabase helpers)
5. packages/api (tRPC setup, context, routers stub for each domain)
6. packages/ui (design tokens from README.md)
7. apps/web (Next.js 15 App Router, tRPC route handler, splash page
   matching the prototype)
8. apps/admin (Next.js 15 App Router, basic auth-gated dashboard)
9. apps/mobile (Expo, tRPC client setup, splash screen matching the
   prototype)

Stop after each package or app and confirm it builds before moving on.
If anything doesn't compile, fix it before continuing to the next step.
```

This staged approach catches issues early. Rushing to scaffold everything at once is where it usually goes wrong.

---

## Step 9 — First run

After Claude Code finishes scaffolding:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate     # applies schema to Supabase
pnpm dev
```

You should see:
- Web running at http://localhost:3000 (shows a splash screen)
- Admin running at http://localhost:3001 (shows a login prompt)
- Mobile showing a QR code in terminal

Scan the mobile QR with your phone (Expo Go app, or a development build). You should see the splash screen matching the prototype.

If anything doesn't work, share the error with Claude Code and ask it to fix. Don't debug manually unless Claude Code is stuck.

---

## Step 10 — Your first commit after scaffolding

```bash
git add .
git commit -m "feat: initial monorepo scaffold

Monorepo structure set up with all three apps and shared packages.
All apps run locally. Splash screens match the prototype.

Next: implement the 6-step onboarding flow."

git push
```

Update `docs/CHANGELOG.md` under `[Unreleased]`:

```md
### Added
- Monorepo scaffold complete: all three apps and shared packages running locally
```

---

## What to build first (in order)

Now that the scaffold works, here's the recommended build order. Each phase is 1-2 weeks.

### Phase 1 — Auth + onboarding (weeks 1-2)

1. Supabase Auth integration (phone OTP flow)
2. Onboarding step 1 (business description)
3. Onboarding step 2 (goal picker)
4. Onboarding step 3 (the analysis moment — wire up Claude Opus call)
5. Onboarding step 4 (Stripe Payment Element + trial start)
6. Onboarding step 5 (Twilio phone provisioning)
7. Onboarding step 6 (Meta OAuth for Instagram)

### Phase 2 — The home + basic agents (weeks 3-4)

1. Home screen with three states (day1, day3, steady) — just UI with mock data
2. Strategist agent (runs on onboarding complete, analyzes business)
3. Scout agent (weekly competitor sweep via `pg_cron`)
4. Needs-you detail screen (photo upload flow)

### Phase 3 — Signal (weeks 5-7)

This is the hero flow. Budget plenty of time.

1. Twilio inbound SMS webhook → Signal handles and replies
2. Twilio call forwarding → Vapi for voice AI
3. Call transcript → extract intent → save to `calls` table
4. Appointment booking logic
5. Signal screens in mobile (live call, missed, convo, booked)
6. Inbox view
7. Lock screen push notification

### Phase 4 — Echo (weeks 8-9)

1. Echo agent: draft generation pipeline
2. Instagram publishing via Meta Graph API
3. Composer screen (draft review)
4. Calendar, performance, trends screens
5. Shadow mode (first 7 days: draft-only, SMS previews)

### Phase 5 — Polish + launch prep (weeks 10-12)

1. Admin panel essentials (users list, subscription management, flagged content)
2. Error states everywhere (IG disconnect, payment failed, rate limited)
3. Empty states (boring week home view)
4. Weekly report (Sunday SMS)
5. App Store submission prep
6. Meta app review submission (if not already started)

Total: ~12 weeks solo, ~6-7 weeks with a partner.

---

## Prompts that will save you hours with Claude Code

### When Claude Code seems stuck

```
Take a step back. What have you tried? List the files you've modified
in this attempt. Then propose a different approach.
```

### When you want a feature done right

```
I want to implement <feature>. Before writing code, please:

1. Read the relevant sections of docs/API.md and docs/DATABASE.md
2. Look at the prototype at prototype/ORB_Prototype_v5.html for UX reference
3. Propose the full plan: DB changes, tRPC routes, UI changes, tests
4. Wait for my approval

Only start coding after I approve the plan.
```

### When you want Claude Code to update docs alongside code

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

---

## Things you might forget

- **Meta app review takes 6-8 weeks.** Start this BEFORE you build Instagram features — by the time you need it in production, review might still be pending.
- **Apple App Store review takes 1-3 days.** Submit early TestFlight builds to learn their process.
- **Twilio phone numbers cost ~$1/month each.** Keep your test pool small.
- **LLM costs can spike fast with bugs.** Set usage alerts in the Anthropic console.
- **Backup your .env.local.** If you lose it and haven't saved it to 1Password or similar, you'll spend hours regenerating secrets.

---

## If you hit a dead end

You've got:
- Docs at `/docs` covering every major decision
- `CLAUDE.md` at root with AI agent instructions
- The original prototype for UX reference
- This session's memory (I remember the whole design journey)

If you get stuck in a way Claude Code can't resolve, come back to a chat session with me. Paste the specific error or decision. I'll have context.

When you return, start with: *"I'm working on ORB. Here's where I am..."* and I can pick up where we left off.

---

## Final thoughts

You're now at the inflection point between designing and building. The docs you have are substantially more thorough than most pre-launch SaaS. That's deliberate — the leverage from good docs during the build phase is enormous, especially when working with AI coding agents.

Two things to remember as you build:

1. **The product thesis is the north star.** When tradeoffs come up, ask "does this make ORB more like a colleague, or more like a tool?" Pick colleague.

2. **Ship ugly before shipping perfect.** Get the six-agent pipeline running end-to-end with ugly UI first. Polish after you've proven it works.

Good luck. Go build it.

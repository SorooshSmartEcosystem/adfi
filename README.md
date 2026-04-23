# ADFI

> Your marketing team, hired. A team of AI agents that run your business end to end.

**Website:** [www.adfi.ca](https://www.adfi.ca)

ADFI is an iOS + Android app that runs a solopreneur's marketing end-to-end: catching missed calls, drafting and publishing social content, watching competitors, answering DMs, and booking appointments. Under the hood, six specialized AI agents coordinate; to the user, it's just ADFI — one friendly colleague doing the work.

## Project status

**Pre-launch.** Clickable prototype is complete (see `/prototype/ORB_Prototype_v6.html`). Full design system, onboarding flow, and product thesis are locked. This repo is where we build the real thing.

## Naming convention — important

This repo uses **two names** deliberately:

- **ADFI** — the brand name. Appears in all user-facing strings, UI copy, marketing, App Store, `adfi.ca`.
- **ORB** — the internal codename. Used for package names (`@orb/api`, `@orb/db`), internal variables, and documentation file names. This is intentional — keeping the codename lets us ship the brand cleanly without rename churn.

When you're writing code that users will see, say "ADFI." When you're naming a package or a variable, use `orb`. This is enforced by convention, not by tooling. See `CLAUDE.md` for the full rule.

## The three apps

This is a monorepo containing three applications that share a backend:

| App | What it is | Stack | Deploys to |
|-----|------------|-------|------------|
| `apps/mobile` | The ADFI consumer app | React Native (Expo) | EAS → App Store + Google Play |
| `apps/web` | Web app + API host | Next.js 15 | Vercel |
| `apps/admin` | Ops dashboard | Next.js 15 | Vercel (private, TOTP-gated) |

All three share types, auth, and database via packages in `/packages`.

**Note on deployments:**
- Marketing site (`adfi.ca`) lives in a **separate** standalone Next.js project (`adfi-landing/`), deployed independently to Vercel. It's not part of this monorepo.
- `apps/web` in this monorepo hosts the tRPC API (consumed by mobile + admin) and may also host a logged-in web version of the app in the future. Probably served at `app.adfi.ca` or `api.adfi.ca`.
- `apps/admin` deploys to `admin.adfi.ca` with Vercel Password Protection enabled.

## Platform targets

**Mobile:** iOS + Android from the same Expo codebase. We ship to both stores.

**Launch strategy:** iOS typically ships first (faster App Store review, higher-paying user base), with Android following 1-4 weeks later once TestFlight feedback has stabilized the product. This isn't a "mobile-first" commitment to iOS — it's sequencing. Android is not a "v2 feature"; it's part of launch scope.

## Quick start

### Prerequisites

- **Node.js** ≥ 20 (use `nvm` to pin it)
- **pnpm** ≥ 9 (we use pnpm workspaces, not npm or yarn)
- **EAS CLI** for mobile: `npm install -g eas-cli`
- **A Supabase project** (free tier is fine to start)
- **Xcode** (for iOS simulator) — Mac only
- **Android Studio** (for Android emulator) — optional for early dev

### First-time setup

```bash
# 1. Clone and install
git clone <repo-url> adfi
cd adfi
pnpm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in every value — see docs/ENVIRONMENT.md for what each one means

# 3. Set up the database
pnpm db:migrate   # applies schema to your Supabase instance
pnpm db:seed      # loads test data (optional, for dev only)

# 4. Start everything
pnpm dev
```

After `pnpm dev`, you should have:

- **Web** running on http://localhost:3000 (hosts the tRPC API)
- **Admin** running on http://localhost:3001
- **Mobile** — scan the Expo QR code with your phone, or press `i` for iOS simulator or `a` for Android emulator

### Running just one app

```bash
pnpm --filter @orb/mobile dev           # just the mobile app (both platforms)
pnpm --filter @orb/mobile ios           # iOS simulator only
pnpm --filter @orb/mobile android       # Android emulator only
pnpm --filter @orb/web dev              # just the API host
pnpm --filter @orb/admin dev            # just the admin panel
```

## Repo structure

```
adfi/
├── apps/
│   ├── mobile/          # React Native (Expo) — iOS + Android
│   ├── web/             # Next.js 15 — tRPC API host
│   └── admin/           # Next.js 15 — internal ops dashboard
├── packages/
│   ├── api/             # tRPC routers (shared contract)
│   ├── db/              # Prisma schema + client
│   ├── ui/              # Shared UI tokens
│   ├── auth/            # Supabase auth helpers
│   └── config/          # Shared eslint, tsconfig, tailwind presets
├── docs/                # Every doc you need — READ THESE
├── prototype/           # Original clickable prototype HTML
└── turbo.json           # Turborepo pipeline config
```

Full tree in `docs/PROJECT_STRUCTURE.md`.

## Critical docs — read these in order

1. **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — every technical decision with rationale
2. **[PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)** — the full monorepo layout
3. **[DATABASE.md](./docs/DATABASE.md)** — schema, ERD, migration strategy
4. **[API.md](./docs/API.md)** — tRPC router structure, endpoint reference
5. **[ENVIRONMENT.md](./docs/ENVIRONMENT.md)** — every env var explained
6. **[RUNBOOK.md](./docs/RUNBOOK.md)** — deploy, debug, add features
7. **[SECURITY.md](./docs/SECURITY.md)** — threat model, secrets, disclosure
8. **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** — code style, commits, PRs
9. **[CHANGELOG.md](./docs/CHANGELOG.md)** — release history

For AI agents (Claude Code, Cursor, etc.) working in this repo, see **[CLAUDE.md](./CLAUDE.md)** at the root.

## Core principles (from the product thesis)

Read these before changing any UI. They're not style preferences — they're rules that define the product:

1. **Status over action** — every screen leads with "what's happening," not "here's what you could do"
2. **Human words, not product words** — "I posted 3 things," not "3 posts published"
3. **Detail is opt-in** — curious users get depth via "show me everything"; casual users never see it
4. **If a screen shows more than 3 things on first load, it's too much**
5. **The test for every screen: what does this let the user *not* do?**

If you catch yourself adding a feature that makes ADFI feel like a tool instead of a colleague, stop. Read `docs/ARCHITECTURE.md` → "Product thesis" section again.

## Design system (locked)

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#FAFAF7` | warm off-white background |
| `--ink` | `#111` | near-black text |
| `--surface` | `#F2EFE5` | card elevation |
| `--border` | `#E5E3DB` at 0.5px (never 1px) | all borders |
| `--alive` | `#7CE896` | "it's working" dot |
| `--attention` | `#FFF9ED` bg + `#F0D98C` border | needs user input |
| `--urgent` | `#C84A3E` | live call, critical only |
| `--font-sans` | SF Pro / Inter | body |
| `--font-mono` | SF Mono / JetBrains Mono | labels, numbers, timestamps |

Two weights only: 400 and 500. Sentence case everywhere. No shadows. No gradients. No icons (dots only). Full spec in `packages/ui/src/tokens.ts`.

## Tech stack summary

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Mobile | Expo (React Native) SDK 54+ — iOS + Android from one codebase |
| Web + Admin | Next.js 15 (App Router) |
| API | tRPC v11 (end-to-end typesafe) |
| Database | Postgres via Supabase |
| Auth | Supabase Auth (phone + email OTP) |
| Storage | Supabase Storage (photos, audio) |
| Payments | Stripe (Billing + Payment Element) |
| Phone + SMS | Twilio |
| Voice AI | Vapi (wraps OpenAI Realtime) |
| LLM | Anthropic Claude (via `@anthropic-ai/sdk`) |
| Social | Meta Graph API (Instagram Business first) |
| Infra | Vercel (web/admin) + EAS (mobile iOS/Android) |
| Push notifications | Apple Push Notification Service + Firebase Cloud Messaging |
| Error tracking | Sentry |
| Analytics | PostHog |

Full rationale for each choice in `docs/ARCHITECTURE.md`.

## Commands cheat sheet

```bash
pnpm dev                    # run all three apps in parallel
pnpm build                  # build everything
pnpm lint                   # lint all packages
pnpm test                   # run all tests
pnpm typecheck              # typecheck all packages

pnpm db:migrate             # apply pending migrations
pnpm db:seed                # load dev seed data
pnpm db:studio              # open Prisma Studio

pnpm mobile:ios             # run iOS simulator
pnpm mobile:android         # run Android emulator
pnpm mobile:build:ios       # EAS build for TestFlight
pnpm mobile:build:android   # EAS build for Google Play

pnpm --filter @orb/web add <pkg>    # add a dependency to a specific app
```

## Need help?

- **Design questions** — reread the product thesis in `docs/ARCHITECTURE.md`
- **Stuck on a bug** — check `docs/RUNBOOK.md` → "Common issues"
- **Security concern** — see `docs/SECURITY.md` for disclosure policy
- **Adding a feature** — `docs/CONTRIBUTING.md` → "Adding a new route"

## License

Proprietary. All rights reserved. This is not open source.

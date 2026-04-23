# ORB

> Your AI marketing team for solopreneurs. Hire it, don't supervise it.

ORB is an iOS-first app that runs a solopreneur's marketing end-to-end: catching missed calls, drafting and publishing social content, watching competitors, answering DMs, and booking appointments. Under the hood, six specialized AI agents coordinate; to the user, it's just ORB — one friendly colleague doing the work.

## Project status

**Pre-launch.** Clickable prototype is complete (see `/prototype/ORB_Prototype_v5.html`). Full design system, onboarding flow, and product thesis are locked. This repo is where we build the real thing.

## The three apps

This is a monorepo containing three applications that share a backend:

| App | What it is | Stack | Deploys to |
|-----|------------|-------|------------|
| `apps/mobile` | The ORB consumer app | React Native (Expo) | EAS → App Store |
| `apps/web` | Marketing site + web onboarding | Next.js 15 | Vercel |
| `apps/admin` | Ops dashboard for the team | Next.js 15 | Vercel (private) |

All three share types, auth, and database via packages in `/packages`.

## Quick start

### Prerequisites

- **Node.js** ≥ 20 (use `nvm` to pin it)
- **pnpm** ≥ 9 (we use pnpm workspaces, not npm or yarn)
- **Expo CLI** for mobile: `npm install -g eas-cli`
- **A Supabase project** (free tier is fine to start)
- **Xcode** if you want to run the iOS simulator locally

### First-time setup

```bash
# 1. Clone and install
git clone <repo-url> orb
cd orb
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

- **Web** running on http://localhost:3000
- **Admin** running on http://localhost:3001
- **Mobile** — scan the Expo QR code with your phone, or press `i` for iOS simulator
- **Backend API** served from the Next.js web app (tRPC route handler)

### Running just one app

```bash
pnpm --filter @orb/mobile dev   # just the mobile app
pnpm --filter @orb/web dev      # just the marketing site
pnpm --filter @orb/admin dev    # just the admin panel
```

## Repo structure

```
orb/
├── apps/
│   ├── mobile/          # React Native (Expo) — the consumer app
│   ├── web/             # Next.js 15 — marketing site + tRPC API host
│   └── admin/           # Next.js 15 — internal ops dashboard
├── packages/
│   ├── api/             # tRPC routers (shared contract)
│   ├── db/              # Prisma schema + client
│   ├── ui/              # Shared UI tokens (colors, spacing, typography)
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

If you catch yourself adding a feature that makes ORB feel like a tool instead of a colleague, stop. Read `docs/ARCHITECTURE.md` → "Product thesis" section again.

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

Two weights only: 400 and 500. Sentence case everywhere. No shadows. No gradients. No icons (dots only). Full spec in `packages/ui/tokens.ts`.

## Tech stack summary

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Mobile | Expo (React Native) SDK 54+ |
| Web + Admin | Next.js 15 (App Router) |
| API | tRPC v11 (end-to-end typesafe) |
| Database | Postgres via Supabase |
| Auth | Supabase Auth (phone + email OTP) |
| Storage | Supabase Storage (photos, audio) |
| Payments | Stripe (Billing + Payment Element) |
| Phone + SMS | Twilio |
| Voice AI | Vapi (wraps OpenAI Realtime) |
| LLM | Anthropic Claude (via `@anthropic-ai/sdk`) |
| Social | Meta Graph API (Instagram Business) |
| Infra | Vercel (web/admin) + EAS (mobile) |
| Error tracking | Sentry |
| Analytics | PostHog (self-hosted option available) |

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

pnpm --filter @orb/web add <pkg>    # add a dependency to a specific app
```

## Need help?

- **Design questions** — reread the product thesis in `docs/ARCHITECTURE.md`
- **Stuck on a bug** — check `docs/RUNBOOK.md` → "Common issues"
- **Security concern** — see `docs/SECURITY.md` for disclosure policy
- **Adding a feature** — `docs/CONTRIBUTING.md` → "Adding a new route"

## License

Proprietary. All rights reserved. This is not open source.

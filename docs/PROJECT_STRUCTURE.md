# PROJECT_STRUCTURE.md

The full monorepo layout. Every folder has a purpose; every file convention is documented here.

## Top-level layout

```
orb/
├── apps/                    # Three deployable applications
│   ├── mobile/              # React Native (Expo) — the consumer app
│   ├── web/                 # Next.js — marketing site + tRPC API host
│   └── admin/               # Next.js — internal ops dashboard (private)
│
├── packages/                # Shared code consumed by apps
│   ├── api/                 # tRPC routers (the shared contract)
│   ├── db/                  # Prisma schema + client
│   ├── ui/                  # Design tokens + shared RN components
│   ├── auth/                # Supabase auth helpers
│   └── config/              # Shared eslint, tsconfig, tailwind presets
│
├── docs/                    # Every doc (this folder)
├── prototype/               # Original clickable prototype (reference only)
│   └── ORB_Prototype_v5.html
│
├── scripts/                 # Dev scripts (seed, migrate, deploy helpers)
│
├── .env.example             # Template for environment variables
├── .gitignore
├── .node-version            # Locks Node version (used by nvm, volta, asdf)
├── .npmrc                   # pnpm-specific settings
├── CLAUDE.md                # Instructions for AI coding agents
├── README.md                # Entry point — read first
├── package.json             # Root workspace manifest
├── pnpm-workspace.yaml      # Defines which folders are workspaces
├── pnpm-lock.yaml           # Lockfile — committed, never manually edited
├── tsconfig.json            # Root TS config (extends config package)
└── turbo.json               # Turborepo pipeline definition
```

## `apps/mobile` — the consumer app

```
apps/mobile/
├── app/                         # Expo Router file-based routing
│   ├── (auth)/                  # Unauthenticated routes
│   │   ├── splash.tsx           # Splash screen
│   │   ├── onboarding/          # 6-step onboarding
│   │   │   ├── business.tsx     # Step 1 — what does your business do
│   │   │   ├── goal.tsx         # Step 2 — what do you want more of
│   │   │   ├── analysis.tsx     # Step 3 — ORB shows its findings
│   │   │   ├── payment.tsx      # Step 4 — card + trial
│   │   │   ├── phone.tsx        # Step 5 — ORB number reveal
│   │   │   └── instagram.tsx    # Step 6 — connect IG (optional)
│   │   └── _layout.tsx
│   ├── (app)/                   # Authenticated routes
│   │   ├── home.tsx             # The one-card home (day1/day3/steady states)
│   │   ├── needs-you/           # When user taps amber card
│   │   ├── everything/          # Activity feed
│   │   ├── calls/               # Signal screens (live call, missed, convo, booked)
│   │   ├── content/             # Echo screens (calendar, composer, performance, trends)
│   │   ├── specialists/         # Agent detail views
│   │   ├── settings/
│   │   └── _layout.tsx
│   ├── _layout.tsx              # Root layout (providers, theme)
│   └── index.tsx                # Entry redirect based on auth state
│
├── components/                  # Reusable components
│   ├── cards/                   # StatusCard, NeedsYouCard, AmberCard, etc.
│   ├── orb/                     # The breathing orb component
│   └── ui/                      # Generic primitives (Button, Chip, Pill)
│
├── hooks/                       # React hooks
│   ├── use-auth.ts
│   ├── use-orb-state.ts
│   └── use-push-notifications.ts
│
├── lib/                         # App-specific utilities
│   ├── trpc.ts                  # tRPC client setup
│   ├── supabase.ts              # Supabase client
│   └── stripe.ts                # Stripe (Payment Element wrapper)
│
├── stores/                      # Zustand stores (auth state, UI state)
├── assets/                      # Fonts, images, audio
├── app.config.ts                # Expo config (replaces app.json)
├── babel.config.js
├── eas.json                     # EAS Build + Update config
├── metro.config.js
├── package.json
└── tsconfig.json
```

### File naming in mobile

- Routes (inside `app/`): `kebab-case.tsx` — Expo Router uses filenames as URLs
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utilities: `kebab-case.ts`

## `apps/web` — marketing site + API host

```
apps/web/
├── app/                         # Next.js 15 App Router
│   ├── (marketing)/             # Public routes
│   │   ├── page.tsx             # Landing page
│   │   ├── pricing/
│   │   └── privacy/
│   ├── api/
│   │   ├── trpc/[trpc]/         # tRPC fetch adapter route
│   │   │   └── route.ts
│   │   ├── webhooks/            # Third-party webhooks
│   │   │   ├── stripe/
│   │   │   ├── twilio/
│   │   │   ├── vapi/
│   │   │   └── meta/
│   │   └── ai/                  # Long-running AI endpoints (non-tRPC)
│   │       └── analyze/
│   ├── layout.tsx
│   └── globals.css
│
├── components/
├── lib/
├── public/
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.ts           # Extends packages/config/tailwind
├── package.json
└── tsconfig.json
```

### Why `apps/web` hosts the API

Pragmatism. Instead of running a separate backend service, we use Next.js API route handlers to host tRPC. Mobile and admin both call `https://web-orb.vercel.app/api/trpc/...`. If we ever need to scale the API independently, we extract `apps/api` and point all clients there. For v1, co-location wins.

## `apps/admin` — internal ops dashboard

```
apps/admin/
├── app/
│   ├── (auth)/login/            # Team-only auth (email + TOTP)
│   ├── (dashboard)/
│   │   ├── page.tsx             # Overview (DAU, revenue, errors)
│   │   ├── users/               # User list + detail
│   │   ├── agents/              # Agent run history + logs
│   │   ├── billing/             # Subscription management
│   │   ├── moderation/          # Content flagged for review
│   │   └── settings/
│   └── layout.tsx
│
├── components/
├── lib/
├── package.json
└── tsconfig.json
```

Admin is deployed to a separate Vercel project with Vercel Password Protection enabled. No public access, ever.

## `packages/api` — the tRPC routers

```
packages/api/
├── src/
│   ├── index.ts                 # Exports the root router + AppRouter type
│   ├── context.ts               # tRPC context (session, db, logger)
│   ├── errors.ts                # TRPCError taxonomy
│   ├── trpc.ts                  # Procedure builders (publicProc, authedProc, etc.)
│   │
│   ├── routers/
│   │   ├── index.ts             # appRouter composition
│   │   ├── auth.ts              # login, logout, refresh
│   │   ├── user.ts              # profile, preferences
│   │   ├── onboarding.ts        # 6-step flow, analysis, finalization
│   │   ├── billing.ts           # Stripe customer, subscription, invoices
│   │   ├── content.ts           # Echo — posts, drafts, scheduling
│   │   ├── messaging.ts         # Signal — inbox, threads, replies
│   │   ├── calls.ts             # Signal — call logs, transcripts
│   │   ├── appointments.ts      # Signal — bookings, rules
│   │   ├── competitors.ts       # Scout — tracked rivals, findings
│   │   ├── insights.ts          # Pulse + Strategist analytics
│   │   └── admin.ts             # Admin-only procedures
│   │
│   ├── agents/                  # Agent implementations
│   │   ├── strategist.ts
│   │   ├── scout.ts
│   │   ├── pulse.ts
│   │   ├── echo.ts
│   │   ├── signal.ts
│   │   └── prompts/             # System prompts as .md files
│   │       ├── strategist.md
│   │       ├── scout.md
│   │       └── ...
│   │
│   └── services/                # Wrappers around third-party APIs
│       ├── stripe.ts
│       ├── twilio.ts
│       ├── vapi.ts
│       ├── meta.ts
│       └── anthropic.ts
│
├── package.json
└── tsconfig.json
```

## `packages/db` — the database layer

```
packages/db/
├── prisma/
│   ├── schema.prisma            # Complete schema (see DATABASE.md)
│   ├── migrations/              # Generated migrations — never edit
│   └── seed.ts                  # Dev seed data
│
├── src/
│   ├── index.ts                 # Exports the prisma client
│   ├── client.ts                # Singleton client setup
│   └── types.ts                 # Helper types (e.g., UserWithSubscription)
│
├── package.json
└── tsconfig.json
```

## `packages/ui` — shared design tokens + primitives

```
packages/ui/
├── src/
│   ├── tokens.ts                # Colors, spacing, typography, radii
│   ├── native/                  # React Native components
│   │   ├── Orb.tsx
│   │   ├── StatusCard.tsx
│   │   ├── AmberCard.tsx
│   │   └── ...
│   └── web/                     # Web components (shared between web + admin)
│       ├── Button.tsx
│       └── ...
│
├── package.json
└── tsconfig.json
```

### Why split native/ and web/

React Native and React DOM can share utilities and types, but not components. An `Orb.tsx` for native uses `View` and `Animated`; for web, it uses `<div>` and CSS keyframes. Same token file drives both.

## `packages/auth` — Supabase auth helpers

```
packages/auth/
├── src/
│   ├── index.ts
│   ├── client.ts                # Client-side Supabase instance
│   ├── server.ts                # Server-side Supabase with cookie handling
│   ├── middleware.ts            # Next.js middleware for protected routes
│   └── hooks.ts                 # React hooks (useUser, useSession)
│
├── package.json
└── tsconfig.json
```

## `packages/config` — shared configs

```
packages/config/
├── eslint/
│   ├── base.js
│   ├── next.js
│   └── react-native.js
├── tsconfig/
│   ├── base.json
│   ├── nextjs.json
│   └── react-native.json
├── tailwind/
│   └── preset.js                # Shared Tailwind preset with our tokens
└── package.json
```

## Workspace wiring

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Every app's `package.json` references shared packages with `workspace:*`:

```json
{
  "dependencies": {
    "@orb/api": "workspace:*",
    "@orb/db": "workspace:*",
    "@orb/ui": "workspace:*",
    "@orb/auth": "workspace:*"
  }
}
```

Every package's `package.json` references peer packages the same way. Changes to `@orb/db` are instantly reflected in `@orb/api` without publishing.

## Turbo pipeline (turbo.json)

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false,
      "persistent": false
    }
  }
}
```

`^build` means "build all upstream dependencies first." Running `pnpm build` at root builds packages in correct order.

## The prototype folder

`prototype/ORB_Prototype_v5.html` is the reference for all UX decisions. It's a standalone HTML file that works offline. Keep it committed and in sync if we make significant UX changes.

If you find yourself asking "should this screen look like X or Y?" — open the prototype. It probably has the answer.

## Files you should never commit

- `.env.local`, `.env.*.local` — real secrets
- `.DS_Store`, `Thumbs.db` — OS cruft
- `dist/`, `.next/`, `build/` — build outputs
- `node_modules/` — package code
- `*.log` — runtime logs
- `*.pem`, `*.key` — certificates

Full list in `.gitignore`. If you catch a secret in git history, STOP and ask for help before rewriting.

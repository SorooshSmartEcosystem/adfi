# PROJECT_STRUCTURE.md

The full monorepo layout. Every folder has a purpose; every file convention is documented here.

## Naming note

This repo uses codename **ORB** for all internal identifiers and brand **ADFI** for all user-facing strings. Package names, folders, and type names use `orb`; app display names, UI copy, and marketing use `adfi`. See `CLAUDE.md` for the full rule.

## Top-level layout

```
adfi/
├── apps/                    # Three deployable applications
│   ├── mobile/              # React Native (Expo) — iOS + Android
│   ├── web/                 # Next.js 15 — tRPC API host (+ future web app)
│   └── admin/               # Next.js 15 — internal ops dashboard (private)
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
│   └── ORB_Prototype_v6.html
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

**The marketing site is NOT in this monorepo.** `adfi.ca` lives in a separate `adfi-landing/` project deployed independently to Vercel. The reason: marketing sites iterate on a different cadence than product code, and mixing them creates pointless deployment coupling.

## `apps/mobile` — iOS + Android consumer app

One codebase, two platforms. Expo builds native iOS and Android apps from this folder.

```
apps/mobile/
├── app/                         # Expo Router file-based routing
│   ├── (auth)/                  # Unauthenticated routes
│   │   ├── splash.tsx           # Splash screen
│   │   ├── onboarding/          # 6-step onboarding
│   │   │   ├── business.tsx     # Step 1 — what does your business do
│   │   │   ├── goal.tsx         # Step 2 — what do you want more of
│   │   │   ├── analysis.tsx     # Step 3 — ADFI shows its findings
│   │   │   ├── payment.tsx      # Step 4 — 3-tier paywall + card + trial
│   │   │   ├── phone.tsx        # Step 5 — ADFI number reveal
│   │   │   └── instagram.tsx    # Step 6 — connect IG (optional)
│   │   └── _layout.tsx
│   ├── (app)/                   # Authenticated routes
│   │   ├── home.tsx             # The one-card home (day1/day3/steady)
│   │   ├── needs-you/           # When user taps amber card
│   │   ├── everything/          # Activity feed
│   │   ├── calls/               # Signal screens
│   │   ├── content/             # Echo screens
│   │   ├── specialists/         # Agent detail views
│   │   ├── settings/
│   │   └── _layout.tsx
│   ├── _layout.tsx              # Root layout (providers, theme)
│   └── index.tsx                # Entry redirect based on auth state
│
├── components/                  # Reusable components
│   ├── cards/                   # StatusCard, NeedsYouCard, AmberCard
│   ├── orb/                     # The breathing orb component
│   └── ui/                      # Generic primitives (Button, Chip, Pill)
│
├── hooks/                       # React hooks
│   ├── use-auth.ts
│   ├── use-adfi-state.ts
│   └── use-push-notifications.ts
│
├── lib/                         # App-specific utilities
│   ├── trpc.ts                  # tRPC client setup
│   ├── supabase.ts              # Supabase client
│   ├── stripe.ts                # Stripe (Payment Element wrapper)
│   └── platform.ts              # iOS/Android platform helpers
│
├── stores/                      # Zustand stores (auth state, UI state)
├── assets/                      # Fonts, images, audio
├── app.config.ts                # Expo config (replaces app.json)
│                                # iOS: bundleIdentifier "ca.adfi.mobile"
│                                # Android: package "ca.adfi.mobile"
├── babel.config.js
├── eas.json                     # EAS Build + Update config (iOS + Android)
├── metro.config.js
├── package.json                 # @orb/mobile
├── google-services.json         # Android Firebase config (not committed)
├── GoogleService-Info.plist     # iOS Firebase config (not committed)
└── tsconfig.json
```

### Platform-specific considerations

**iOS-only files:**
- `GoogleService-Info.plist` — Firebase config for iOS push notifications

**Android-only files:**
- `google-services.json` — Firebase config for Android push notifications

**Platform-specific code in TypeScript:**

Use Expo's `Platform.OS` sparingly when behavior must differ:

```ts
import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
  // iOS-specific
} else if (Platform.OS === 'android') {
  // Android-specific
}
```

Prefer shared code where possible. Platform-specific paths are a code smell.

### File naming in mobile

- Routes (inside `app/`): `kebab-case.tsx` — Expo Router uses filenames as URLs
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utilities: `kebab-case.ts`

## `apps/web` — tRPC API host (+ future web app)

```
apps/web/
├── app/                         # Next.js 15 App Router
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
│   └── page.tsx                 # Placeholder (future web app home)
│
├── components/
├── lib/
├── public/
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.ts           # Extends packages/config/tailwind
├── package.json                 # @orb/web
└── tsconfig.json
```

### Why `apps/web` hosts the API

Pragmatism. Instead of running a separate backend service, we use Next.js API route handlers to host tRPC. Mobile and admin both call `https://api.adfi.ca/api/trpc/...` (or equivalent). If we ever need to scale the API independently, we extract it later. For v1, co-location wins.

### Future: signed-in web version

If/when we build a web version of the ADFI mobile app (for users who want to use ADFI from a desktop browser), it goes in `apps/web/app/(app)/` alongside the API routes. For now, this is future work. The marketing site at `adfi.ca` is a separate project entirely.

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
├── package.json                 # @orb/admin
└── tsconfig.json
```

Admin is deployed to a separate Vercel project at `admin.adfi.ca` with Vercel Password Protection enabled. No public access, ever.

## `packages/api` — the tRPC routers

```
packages/api/
├── src/
│   ├── index.ts                 # Exports the root router + AppRouter type
│   ├── context.ts               # tRPC context (session, db, logger)
│   ├── errors.ts                # TRPCError taxonomy
│   ├── trpc.ts                  # Procedure builders
│   │
│   ├── routers/
│   │   ├── index.ts             # appRouter composition
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── onboarding.ts
│   │   ├── billing.ts
│   │   ├── content.ts
│   │   ├── messaging.ts
│   │   ├── calls.ts
│   │   ├── appointments.ts
│   │   ├── competitors.ts
│   │   ├── insights.ts
│   │   ├── brand-kit.ts          # Senior-designer agent: kit generate / edit / version history
│   │   └── admin.ts
│   │
│   ├── agents/                  # Agent implementations
│   │   ├── strategist.ts
│   │   ├── scout.ts
│   │   ├── pulse.ts
│   │   ├── echo.ts
│   │   ├── signal.ts
│   │   └── prompts/             # System prompts as .md files
│   │       ├── strategist.md
│   │       └── ...
│   │
│   └── services/                # Wrappers around third-party APIs
│       ├── stripe.ts
│       ├── twilio.ts
│       ├── vapi.ts
│       ├── meta.ts
│       └── anthropic.ts
│
├── package.json                 # @orb/api
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
│   └── types.ts                 # Helper types
│
├── package.json                 # @orb/db
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
│   └── web/                     # Web components
│       ├── Button.tsx
│       └── ...
│
├── package.json                 # @orb/ui
└── tsconfig.json
```

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
├── package.json                 # @orb/auth
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
├── src/
│   ├── env.server.ts            # Server env validation (zod)
│   ├── env.client.ts            # Client env validation
│   └── env.expo.ts              # Expo env validation
└── package.json                 # @orb/config
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

`prototype/ORB_Prototype_v6.html` is the reference for all UX decisions. It's a standalone HTML file that works offline. Keep it committed and in sync if we make significant UX changes.

If you find yourself asking "should this screen look like X or Y?" — open the prototype. It probably has the answer.

## Files you should never commit

- `.env.local`, `.env.*.local` — real secrets
- `google-services.json` — Android Firebase config (treat as secret)
- `GoogleService-Info.plist` — iOS Firebase config (treat as secret)
- `.DS_Store`, `Thumbs.db` — OS cruft
- `dist/`, `.next/`, `build/` — build outputs
- `node_modules/` — package code
- `*.log` — runtime logs
- `*.pem`, `*.key`, `*.p12`, `*.keystore` — certificates

Full list in `.gitignore`. If you catch a secret in git history, STOP and ask for help before rewriting.

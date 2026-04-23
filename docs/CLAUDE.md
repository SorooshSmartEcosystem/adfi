# CLAUDE.md

Instructions for Claude Code (and other AI coding agents) working in this repository.

## Before you do anything

1. Read `docs/ARCHITECTURE.md` end-to-end. It contains decisions you must not override without discussion.
2. Read `docs/PROJECT_STRUCTURE.md` to understand the monorepo layout.
3. Check `docs/CHANGELOG.md` to see what state the project is in right now.
4. If modifying UI, read the "Core principles" and "Design system" sections of `README.md`. These are not preferences — they are rules.

## What this project is

ORB is an iOS-first AI marketing app for solopreneurs. The product thesis is that the user **hires** ORB rather than **supervises** it. This shapes every technical decision:

- Backend must handle autonomous work (not wait for user confirmation on every action)
- Mobile UI must look empty when things are working (status over action)
- Language must sound like a colleague ("I posted 3 things"), not a SaaS tool ("3 posts published")
- Detail is always opt-in, never default

If a feature request conflicts with these principles, push back before implementing.

## Architecture (do not override)

- **Monorepo**: pnpm workspaces + Turborepo
- **Mobile**: Expo managed workflow (React Native). Never eject without explicit permission.
- **Web + Admin**: Next.js 15 App Router (NOT Pages Router)
- **API**: tRPC v11 only. Do not create REST endpoints unless specifically required (e.g., webhooks).
- **Database**: Postgres via Supabase. Use Prisma as the ORM.
- **Auth**: Supabase Auth. Do not replace with Clerk, NextAuth, or custom auth.
- **Payments**: Stripe only. Use the Payment Element, not Checkout, for embedded UX.
- **LLM**: Anthropic SDK (`@anthropic-ai/sdk`). Claude is the default model for all agent work.

## File conventions

### TypeScript

- Strict mode always on. No `any` without an inline comment justifying it.
- Prefer `type` over `interface` except for public library surfaces.
- No default exports. Named exports only.
- File names: `kebab-case.ts` for modules, `PascalCase.tsx` for React components.

### React / React Native

- Functional components only. No class components.
- Hooks colocated with components when only used once; extracted to `hooks/` when reused.
- No prop drilling past 2 levels — use context or a store (Zustand).
- Avoid `useEffect` when possible. Prefer derived state and event handlers.

### Styling

- Mobile: React Native `StyleSheet.create`. No inline styles for anything reused.
- Web: Tailwind CSS with our custom preset in `packages/config/tailwind`.
- Shared design tokens live in `packages/ui/tokens.ts`. Never hardcode colors — import tokens.

### tRPC routers

- Every route must have a Zod input schema, even if it takes no input (`z.void()`).
- Procedures are namespaced by domain: `trpc.user.getProfile`, `trpc.agent.signal.handleCall`, etc.
- Mutations that call external services (Stripe, Twilio, Meta) wrap errors in our `TRPCError` taxonomy — see `packages/api/src/errors.ts`.
- Long-running operations (> 10s) must be queued, not run inline. Use Supabase Edge Functions or a separate worker.

### Database

- Never write raw SQL in app code. Always go through Prisma.
- Migrations live in `packages/db/prisma/migrations/`. Never edit a migration after it's been applied.
- Every table has `id` (uuid), `created_at`, `updated_at`. Use the shared base model in `schema.prisma`.
- Soft deletes for user-visible data (`deleted_at`). Hard deletes for system data.

## Things that will get rejected in review

- Any new top-level package in `/packages` without discussion
- Any change that bypasses Supabase RLS (Row Level Security)
- Any `// @ts-ignore` without an issue link explaining why
- New dependencies without checking that a simpler alternative doesn't exist in an existing dep
- Any UI with shadows, gradients, or icons — read the design system in `README.md`
- Phrases like "processing..." or "loading..." visible to users — the product voice says "let me think" or "one second"
- Any screen that shows more than 3 pieces of content on first load

## When you're uncertain

- Check if the prototype answers it: `prototype/ORB_Prototype_v5.html` is the reference for UX decisions
- Check if a doc answers it: `docs/` has dedicated files for database, API, architecture
- Still uncertain? Open a draft PR or comment in the code with `// QUESTION:` and move on — don't block yourself

## Workflow expectations

When asked to add a feature:

1. **Propose the plan first.** File tree, routes, DB changes, UI changes. Wait for approval.
2. **Implement in small commits.** One concern per commit.
3. **Update docs.** If you change the DB schema, update `docs/DATABASE.md`. If you add a tRPC route, update `docs/API.md`.
4. **Write a test** for any new business logic. Not for pure UI.
5. **Update `docs/CHANGELOG.md`** under `[Unreleased]` for anything user-visible.

When asked to fix a bug:

1. **Reproduce first.** Write a failing test if possible.
2. **Find the root cause.** Don't patch symptoms.
3. **Explain what was wrong** in the commit message, not just what you changed.

When asked to "just make it work":

Push back. "Just make it work" often means "cut a corner you'll regret." Ask what the acceptable tradeoffs are.

## Scaffolding from zero

If this is a fresh checkout with no code yet (only docs), your first task is to scaffold the monorepo. The expected sequence:

1. Initialize pnpm workspace at repo root
2. Create `turbo.json` with the pipeline defined in `docs/ARCHITECTURE.md`
3. Scaffold `apps/web` with `create-next-app` (App Router, TypeScript, Tailwind, no src/)
4. Scaffold `apps/admin` the same way, different port
5. Scaffold `apps/mobile` with `create-expo-app` (TypeScript template)
6. Create `packages/db` with Prisma initialized
7. Create `packages/api` with tRPC v11 setup
8. Create `packages/ui` with shared tokens file
9. Create `packages/auth` with Supabase client helpers
10. Create `packages/config` with shared tsconfig, eslint, tailwind presets
11. Wire up: apps depend on packages, packages depend on each other appropriately
12. Add `.env.example` with every variable from `docs/ENVIRONMENT.md`
13. Add initial database schema from `docs/DATABASE.md`
14. Add a health check tRPC route and a splash screen that calls it

Before running step 1, show me the full file tree you plan to create. Wait for approval.

## Prompting yourself well

For anyone writing prompts *to* Claude Code in this repo:

- Reference specific files (`apps/mobile/src/screens/HomeScreen.tsx`) rather than vague descriptions
- Provide the full context in one prompt when possible — Claude Code handles long prompts well
- For complex features, break into phases and ask for a plan before implementation
- When iterating, say "change X to Y" rather than describing the whole thing again

## Secrets and safety

- Never commit `.env.local` or any file containing real secrets
- Never log user phone numbers, card info, or message content in production code
- Stripe webhook signatures must be verified server-side — do not skip this
- Meta Graph API tokens must be stored encrypted at rest in the database
- If you find an existing secret committed to git history, STOP and ping the team — do not try to rewrite history yourself

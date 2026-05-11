# CLAUDE.md

Instructions for Claude Code (and other AI coding agents) working in this repository.

## Operating rules (read first)

### 1. Think before coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity first

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### 4. Goal-driven execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### 5. Use the model only for judgment calls

Use the LLM for: classification, drafting, summarization, extraction.
Do NOT use the LLM for: routing, retries, deterministic transforms.
If code can answer, code answers.

### 6. Token budgets are not advisory

Per-task: 4,000 tokens. Per-session: 30,000 tokens.
If approaching budget, summarize and start fresh.
Surface the breach. Do not silently overrun.

### 7. Surface conflicts, don't average them

If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

### 8. Read before you write

Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

### 9. Tests verify intent, not just behavior

Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

### 10. Checkpoint after every significant step

Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

### 11. Match the codebase's conventions, even if you disagree

Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

### 12. Fail loud

"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

## Before you do anything

1. Read `docs/ARCHITECTURE.md` end-to-end. It contains decisions you must not override without discussion.
2. Read `docs/PROJECT_STRUCTURE.md` to understand the monorepo layout.
3. Check `docs/CHANGELOG.md` to see what state the project is in right now.
4. If modifying UI, read the "Core principles" and "Design system" sections of `README.md`. These are not preferences — they are rules.

## What this project is

ADFI is a mobile app for iOS + Android that is an AI marketing team for solopreneurs. The product thesis is that the user **hires** ADFI rather than **supervises** it. This shapes every technical decision:

- Backend must handle autonomous work (not wait for user confirmation on every action)
- Mobile UI must look empty when things are working (status over action)
- Language must sound like a colleague ("I posted 3 things"), not a SaaS tool ("3 posts published")
- Detail is always opt-in, never default

If a feature request conflicts with these principles, push back before implementing.

## Critical naming convention — read carefully

This repo uses **two names** deliberately:

- **ADFI** — the brand name. Use in ALL user-facing strings, UI copy, toast messages, email templates, error messages users see, marketing copy, the app name itself in App Store / Google Play.
- **ORB** — the internal codename. Use for ALL package names (`@orb/api`, `@orb/db`, `@orb/ui`), internal variables, type names, class names, file names, git branches, code comments.

**Why the split:** We locked in the brand ADFI after scaffolding started. Renaming packages mid-build would invalidate completed work. So internal code stays `orb`; user-facing text says `adfi`. Keeping this split means users see a consistent brand while we avoid breaking the build.

**In practice:**
```ts
// Package imports — use orb
import { userRouter } from '@orb/api/routers/user';

// User-facing strings — use adfi (lowercase, sentence case per design system)
<Text>welcome to adfi</Text>
toast.show("adfi is getting ready for you...");

// Variable names — use orb
const orbPhoneNumber = user.phoneNumber;

// App Store / Play Store display name — ADFI
// Bundle identifier — ca.adfi.mobile or similar (this is user-visible in settings)
```

**If unsure, ask.** Don't guess.

## Architecture (do not override)

- **Monorepo**: pnpm workspaces + Turborepo
- **Mobile**: Expo managed workflow (React Native). Ships to iOS AND Android from one codebase. Never eject without explicit permission.
- **Web + Admin**: Next.js 15 App Router (NOT Pages Router)
- **API**: tRPC v11 only. Do not create REST endpoints unless specifically required (e.g., webhooks).
- **Database**: Postgres via Supabase. Use Prisma as the ORM.
- **Auth**: Supabase Auth. Do not replace with Clerk, NextAuth, or custom auth.
- **Payments**: Stripe only. Use the Payment Element, not Checkout, for embedded UX.
- **LLM**: Anthropic SDK (`@anthropic-ai/sdk`). Claude is the default model for all agent work.

## Platform scope — iOS and Android from one codebase

The mobile app ships to **both** iOS and Android. This is not "iOS-first, Android later" — both are launch targets. That said:

- **Development primarily tests against iOS** — it's the primary profile of our target solopreneur, and iOS review cycles are faster
- **Android tests happen in parallel** — every feature should be tested on Android before a release
- **Android-specific code** (FCM push, back button handling, Android status bar) should be clearly marked and kept minimal
- **If a feature requires native code that only works on one platform, flag it and propose alternatives** before implementing

Do not assume "iOS-only" is acceptable for any feature unless explicitly told.

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
- When platform-specific behavior is needed, use Expo's `Platform.OS` checks clearly and sparingly.

### Styling

- Mobile: React Native `StyleSheet.create`. No inline styles for anything reused.
- Web: Tailwind CSS with our custom preset in `packages/config/tailwind`.
- Shared design tokens live in `packages/ui/src/tokens.ts`. Never hardcode colors — import tokens.

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
- User-facing strings saying "ORB" instead of "ADFI"
- Package names or variables saying "ADFI" instead of "orb"
- Android-incompatible code without a flag and justification

## When you're uncertain

- Check if the prototype answers it: `prototype/ORB_Prototype_v6.html` is the reference for UX decisions
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
3. Create `packages/config` (shared eslint, tsconfig, tailwind presets)
4. Create `packages/ui` with shared tokens file
5. Create `packages/db` with Prisma initialized
6. Create `packages/auth` with Supabase client helpers
7. Create `packages/api` with tRPC v11 setup
8. Scaffold `apps/web` with Next.js 15 (App Router, TypeScript, Tailwind)
9. Scaffold `apps/admin` the same way, different port
10. Scaffold `apps/mobile` with Expo (TypeScript template, targeting iOS + Android)
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

# CONTRIBUTING.md

How to work in this repo. Even if you're the only human contributor right now, your future self is the second contributor — these conventions exist for them.

## Branching

- `main` — always deployable. Never commit here directly.
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `chore/<name>` — tooling, deps, refactors
- `docs/<name>` — documentation-only changes

Branch names use kebab-case: `feature/add-signal-setup-flow`, not `feature/addSignalSetup`.

Delete branches after merging. Keep the list short.

## Commit messages

We follow Conventional Commits. The format:

```
<type>(<scope>): <short description>

<optional body explaining WHY>

<optional footer, e.g., closes #123>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New user-visible feature |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't change behavior |
| `perf` | Performance improvement |
| `docs` | Documentation changes only |
| `test` | Adding or fixing tests |
| `chore` | Tooling, deps, build config |
| `style` | Formatting, whitespace (rare — we have prettier) |

### Scopes

Use the affected app or package as scope:

- `feat(mobile): ...`
- `fix(api): ...`
- `chore(db): ...`
- `docs(security): ...`

For cross-cutting changes, omit the scope:

```
feat: add shadow mode to onboarding and home
```

### Body (when to include)

Always explain **why**, not **what**. Git diff shows what. Examples:

Good:
```
feat(mobile): move paywall to after analysis moment

The user is far more likely to convert when they've just seen
ORB's analysis of their business. Moving the paywall from step 1
to step 3 converts 2.3x better in A/B tests.
```

Bad:
```
feat(mobile): update onboarding step 3
```

### Short commits

For trivial changes, one-line is fine:

```
fix(ui): typo in amber card
```

## Pull requests

### Size

Keep PRs small. Rule of thumb: if the diff is more than 400 lines, it's probably two PRs.

Exceptions: initial scaffolding, large refactors (flag these in the title with `[LARGE]`).

### PR template

The PR description should answer:

1. **What does this change?** (1-2 sentences)
2. **Why?** (the real reason, not "because it was on the backlog")
3. **How did you test it?** (even "ran locally and clicked through" counts)
4. **Any risks?** (things that could break, or that reviewers should pay attention to)
5. **Does it need a DB migration?** (yes/no — if yes, linked migration ID)
6. **Does it need new env vars?** (yes/no — if yes, added to `.env.example` and `docs/ENVIRONMENT.md`)

### Review expectations

- **Self-review first.** Before requesting review, read your own diff. You'll catch most issues.
- **One reviewer is enough** for routine changes. Two reviewers for anything touching auth, payments, or RLS.
- **Request changes, don't block.** Comments should be actionable.
- **CI must pass** before merge. No exceptions.

### Merging

Use "Squash and merge" by default. This keeps `main` history clean.

For large PRs where commit history matters (e.g., scaffolding), use "Rebase and merge."

Never use "Create a merge commit" — it clutters history.

## Code style

Most style is enforced by tooling (prettier, eslint). The conventions below are the ones tools can't enforce.

### TypeScript

- **Strict mode everywhere.** No exceptions.
- **No `any`** without an inline comment: `// @ts-expect-error <reason>` or `as unknown as <type>` with comment.
- **Prefer `type` over `interface`.** Use `interface` only when you need declaration merging or when exposing a public library surface.
- **Named exports, not default.** Makes refactoring and imports unambiguous.
  ```ts
  // Good
  export function getHomeData() { ... }

  // Bad
  export default function getHomeData() { ... }
  ```
  Exception: Next.js page components require default exports. Everything else, named.

- **No enums.** Use `as const` objects with derived types.
  ```ts
  // Good
  export const Plan = { SOLO: 'SOLO', TEAM: 'TEAM', STUDIO: 'STUDIO' } as const;
  export type Plan = typeof Plan[keyof typeof Plan];

  // Bad
  export enum Plan { SOLO, TEAM, STUDIO }
  ```
  Exception: Prisma-generated enums are fine.

- **Prefer `unknown` over `any`** for external/uncertain input, then narrow.

### React / React Native

- **Functional components only.** No class components.
- **One component per file** for top-level components. Sub-components can share a file if they're tightly coupled.
- **Props destructured in signature**:
  ```tsx
  // Good
  export function StatusCard({ title, subtitle, dotColor }: StatusCardProps) { ... }

  // Bad
  export function StatusCard(props: StatusCardProps) {
    const { title } = props;
    ...
  }
  ```
- **No prop drilling past 2 levels.** Use context or a store.
- **`useEffect` is a code smell.** Before adding one, ask: can this be derived state? An event handler? A tRPC subscription?
- **No custom hooks that wrap a single tRPC call.** Just call `trpc.x.useQuery()` inline.

### Styling

- **Mobile:** `StyleSheet.create` at the bottom of each file. Never inline styles for reused values.
- **Web:** Tailwind CSS via our shared preset. Use our custom tokens (`bg-surface`, `text-ink`), not Tailwind defaults (`bg-gray-100`, `text-black`).
- **No magic numbers.** Spacing, font sizes, border radii all come from `packages/ui/tokens.ts`.

### Files and folders

- **File names:** `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- **No index files** unless re-exporting from a whole folder (barrel files). Individual re-exports are noise.
- **Colocate tests:** `foo.ts` and `foo.test.ts` in the same folder.

### Error handling

- **Don't swallow errors.** Either handle them or let them bubble.
- **User-facing errors use ORB voice.** "I'll retry," not "500 Internal Server Error."
- **Log errors with context.** `log.error('failed to publish post', { userId, draftId, error })` — not just `log.error(error)`.

### Comments

- **Comment the why, not the what.** The code shows what. Comments explain why.
- **TODO comments must include a ticket or date.** `// TODO(bob, 2026-05-01): clean this up after the migration`. Orphan TODOs accumulate.
- **No commented-out code.** Delete it. Git remembers.

## Testing

### What we test

- **Business logic** in tRPC procedures (especially anything touching money, auth, or agent coordination)
- **Data transformations** (parsing, formatting, mapping)
- **Edge cases** in date handling, timezone logic, number formatting

### What we don't test

- **Pure UI components** (visual regression belongs to Storybook/Chromatic, not unit tests)
- **Framework-level code** (tRPC routing, Next.js routing — already tested upstream)
- **Trivial getters/setters**

### Testing tools

- **Unit + integration:** Vitest
- **Component:** React Testing Library (for web only; RN Testing Library for mobile if needed)
- **E2E:** Playwright (web) + Maestro (mobile) — set up when we have user-facing flows stable

### Test naming

```ts
describe('content.approveDraft', () => {
  it('moves a draft from AWAITING_REVIEW to APPROVED', async () => { ... });
  it('throws if draft belongs to another user', async () => { ... });
  it('schedules publishing if scheduled_for is set', async () => { ... });
});
```

Not `it('works')`. Not `it('test 1')`. Describe the behavior.

## Adding dependencies

Before adding a new package, ask:

1. Is there a simpler alternative in an existing dep?
2. Is this package well-maintained? (last commit < 6 months, > 1k weekly downloads)
3. Does it add significant bundle size? (check with `npx size-limit` for mobile/web)
4. Is the license compatible with commercial use?

If unsure, discuss in the PR.

### Locking versions

- **Exact versions for production deps** (`"zod": "3.22.4"`) — not `^` or `~`.
- **Caret OK for dev deps** (`"^5.0.0"`).
- **Use Renovate or Dependabot** to bump deps on a schedule. Don't update opportunistically.

## Dealing with Claude Code

Claude Code (the AI coding agent) is a first-class contributor to this repo. When working with it:

- **Read `CLAUDE.md` first** — it contains the conventions Claude Code follows in this repo
- **Give it full context** in one prompt when possible
- **Ask for a plan before implementation** for anything non-trivial
- **Review its PRs like you would a human's** — CI must pass, tests must exist, docs must update

Claude Code is good at:

- Scaffolding based on clear specs
- Refactoring with clear intent
- Writing tests for existing code
- Generating repetitive CRUD routes

Claude Code is less good at:

- Novel product decisions (come back to the human for these)
- Complex UX tradeoffs (point at the prototype)
- Subtle state bugs with lots of history (might need human pairing)

## Code review checklist

When reviewing a PR, check:

**Correctness:**
- [ ] Does it do what the description says?
- [ ] Are edge cases handled (empty lists, null values, errors)?
- [ ] Are there tests for new business logic?

**Security:**
- [ ] Does it touch auth or RLS? If so, double-check.
- [ ] Are new env vars properly scoped (not `NEXT_PUBLIC_` if sensitive)?
- [ ] Does it log anything sensitive?

**Performance:**
- [ ] Any N+1 queries? (look for loops calling tRPC or Prisma)
- [ ] Any new API calls in a render loop?
- [ ] Any new indexes needed? (check DATABASE.md)

**Maintainability:**
- [ ] Does naming match conventions?
- [ ] Are there tests?
- [ ] Are docs updated (API.md, DATABASE.md, CHANGELOG.md)?
- [ ] Any TODO comments — are they tracked?

**UX:**
- [ ] Does it match the prototype?
- [ ] Does error messaging use ORB voice?
- [ ] Are loading states handled?

## Shipping process

Every merge to `main`:

1. CI runs lint + typecheck + tests
2. If CI passes, Vercel deploys web + admin to production
3. DB migrations apply automatically (if any)
4. Sentry creates a new release
5. PostHog starts tracking events for the new release

Mobile is separate — merging to `main` does NOT ship mobile. You must manually:

- Either run `eas update` (OTA for JS changes)
- Or `eas build --profile production && eas submit` (new binary, App Store review)

## Postmortems

Any production incident that affected users gets a postmortem. Template:

```
## Incident: <short description>
Date: <date>
Duration: <time>
Severity: <low/medium/high>

## What happened
<timeline>

## Why it happened
<root cause — not just the proximate cause>

## How we fixed it
<what was done>

## How we'll prevent it
<specific action items with owners>
```

No blame. Everyone makes mistakes. The goal is to prevent the same class of mistake.

## One last thing

This doc is a living document. If a convention isn't working, propose changing it. PRs to CONTRIBUTING.md are welcome and encouraged.

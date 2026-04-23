# CHANGELOG

All notable changes to ORB will be documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/) for the API and its consumers.

Format note: write changes from the user's perspective in plain English. "Users can now..." is better than "Refactored the x subsystem."

## [Unreleased]

### Added
- Nothing yet — start adding entries here as you ship changes.

### Changed
- Nothing yet.

### Fixed
- Nothing yet.

### Removed
- Nothing yet.

---

## [0.1.0] — 2026-04-20 — Initial project setup

This release establishes the project foundation. No user-facing functionality yet — this is the scaffolding release.

### Added
- Monorepo structure with pnpm workspaces + Turborepo
- Three apps scaffolded: `apps/mobile` (Expo), `apps/web` (Next.js 15), `apps/admin` (Next.js 15)
- Five shared packages: `@orb/api`, `@orb/db`, `@orb/ui`, `@orb/auth`, `@orb/config`
- Complete documentation suite in `/docs`:
  - README — project overview and quick start
  - ARCHITECTURE — technical decisions with rationale
  - PROJECT_STRUCTURE — full monorepo layout
  - DATABASE — complete Prisma schema with ERD and RLS policies
  - API — tRPC router structure and endpoint reference
  - ENVIRONMENT — every env var explained
  - RUNBOOK — day-to-day operations
  - SECURITY — threat model and disclosure policy
  - CONTRIBUTING — code style, commits, PRs
  - CHANGELOG — this file
- `CLAUDE.md` at repo root with instructions for AI coding agents
- `.env.example` template with all required environment variables
- Reference prototype preserved at `prototype/ORB_Prototype_v5.html`

### Architecture decisions locked
- Mobile: Expo managed workflow (React Native)
- Web + Admin: Next.js 15 App Router
- API: tRPC v11 (end-to-end type safety)
- Database: Postgres via Supabase
- Auth: Supabase Auth (phone OTP primary)
- Payments: Stripe Billing + Payment Element
- Phone + SMS: Twilio
- Voice AI: Vapi
- LLM: Anthropic Claude (Opus 4.7 default, Sonnet 4.6 for lighter tasks, Haiku 4.5 for real-time)
- Social: Meta Graph API (Instagram first)
- Infra: Vercel (web/admin) + EAS (mobile)

---

## How to use this changelog

When you ship a user-visible change:

1. Open CHANGELOG.md
2. Under `[Unreleased]`, add a one-line entry in the appropriate subsection (Added / Changed / Fixed / Removed / Security)
3. Write it from the user's perspective ("Users can now connect their Facebook Page" — not "Added `connectFacebookPage` mutation")
4. On release, move `[Unreleased]` entries under a new version header with today's date

### Version numbering

We follow SemVer for the tRPC API (which mobile and admin consume):

- **MAJOR** (`1.0.0` → `2.0.0`): Breaking API changes. Mobile/admin must be updated.
- **MINOR** (`0.1.0` → `0.2.0`): New features, backward compatible.
- **PATCH** (`0.1.0` → `0.1.1`): Bug fixes, no API changes.

User-facing releases (app store versions) don't follow the tRPC version directly. Mobile and web have their own version numbers tracked in their respective `app.config.ts` / `package.json`.

### Release cadence

No fixed cadence. Ship when features are ready. Write changelog entries as you go — it's 10x easier than trying to reconstruct them at release time.

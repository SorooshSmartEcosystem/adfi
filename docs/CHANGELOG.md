# CHANGELOG

All notable changes to ORB will be documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/) for the API and its consumers.

Format note: write changes from the user's perspective in plain English. "Users can now..." is better than "Refactored the x subsystem."

## [Unreleased]

### Added
- Brand-kit history. Every generation is snapshotted to `brand_kit_versions`; the brand-kit panel now shows a "history" section with a palette swatch + date for each past version and a one-click restore. Restore copies the chosen version into the live row and bumps the version number; no model is called and no monthly credit is consumed.
- One-file HTML brand book download. The downloads section now leads with `<slug>-brand-book-v<n>.html` — a self-contained file with every SVG inlined that opens in any browser and is ready to share with a designer.
- Web app feels noticeably faster: every dash route now paints structure immediately via streaming `loading.tsx` skeletons, the same getHomeData / user.me query is no longer fetched twice on a single render (deduped via React `cache`), and the inbox feed scans 30 days of messages instead of all-time and selects only the columns needed to render previews. Together these eliminate ~1s of perceived latency on most page navigations.
- Platform filter chips on /content. Filter the drafts tab by instagram / twitter / linkedin / facebook / telegram / website article / email; same filter on the performance tab.
- Twitter, Telegram channel posts, and website-article drafts are first-class platforms in echo. Twitter drafts stay manual — approve, copy, open compose, then "mark as posted" once it's live (we don't pay for Twitter's API tier in v1).
- Telegram bot + channel connection on /settings. Paste a BotFather token to let signal answer telegram dms in your voice; paste a channel @username (with the bot added as admin) to publish posts to the channel.
- Echo generates real photos for every format — single posts get a per-platform hero, carousels get a cover photo plus full-bleed image_cue slides, email newsletters get a 16:9 hero embedded in the html, reels get a 9:16 still per beat, and stories get one per frame. Powered by Replicate Flux Schnell; per-image cost surfaces in the admin financials.
- "Reroll images" button on every draft re-runs Replicate against the current copy when the first pass produced something off-brand.
- "Send to me first" button on email-newsletter drafts fires a one-recipient preview to the owner's inbox before approving for the list.
- Inline draft editor — hook/body/cta/hashtags for single posts, caption + hashtags for carousels and reels, subject line for newsletters. No more rewrite-from-scratch when the agent gets 90% there.
- Plan grid drill-in — clicking a slot in this week's plan jumps to the underlying draft on the drafts tab.
- Public `/privacy`, `/terms`, `/cookies` pages.
- Sitemap, robots.txt, and a generated OpenGraph image so shares on twitter/slack/etc. show the right preview.
- Dashboard now redirects new users to onboarding when their brand voice isn't set yet (instead of 500ing).
- Dashboard redesign — live "everything is running" pill, four KPI cards with sparklines (revenue impact, reach, conversations, time saved), a big reach-over-time chart with 1W/4W/3M/1Y range toggle, channel cards for Instagram/LinkedIn/Calls+SMS/Email with status dots, a 14-day engagement bar chart, a what's-working ranked list, and a restyled timeline activity feed.
- Reach chart and engagement bars now read real per-day data from a new `getReachTimeseries` rollup over `ContentPost.metrics.reach`.
- Revenue-impact KPI now sums `Appointment.estimatedValueCents` for the week (with the prior $400/appt heuristic kept as a fallback for accounts without value entered).
- "What's working" panel now ranks last-30-day post performance by format and content pillar against the user's own baseline — populates once you've published 3+ posts.
- Inline brand-voice editor on `/specialist/strategist` — add/remove voice tone, values, audience segments, content pillars, and the do-not-do list without re-running Strategist.
- Approved Instagram/LinkedIn/Facebook drafts now show "scheduled · waiting on instagram — connect →" with a deep link to settings, instead of looking like a dead end.
- Admin user list at `/admin/dashboard/users?q=` filters by email/phone/uuid substring.
- Admin user-detail and overview now split Replicate (Echo image generation) spend out of the Anthropic bucket so per-user financials are honest.
- Branded 404 page and an in-app error fallback that surfaces the digest for support.
- Favicon, apple-touch-icon, and a PWA manifest so the dashboard installs from Chrome/Safari.

### Changed (pricing reshape · 2026-04-28)
- **Plan ladder rebuilt around capability gates, not credit caps.** Each upgrade now unlocks a specific new capability so the value of going up is obvious:
  - **SOLO $29/mo** (was $49) — 1 business · 60 credits · DM-only
  - **TEAM $79/mo** (was $99) — 1 business · 250 credits · adds voice calls + web research + priority queue
  - **STUDIO $199/mo** (unchanged) — now **2 businesses** (was 1) · 600 shared credits · custom newsletter domain + analytics
  - **AGENCY $499/mo** (NEW tier) — up to 8 businesses · 2000 shared credits · white-label, client dashboards, 3 team seats
- 7-day trial is now full TEAM access (50 credits + 5 voice calls), not the old 20-credit hobbled tier — users see the killer features (voice, research, priority) before deciding. Card-on-file required, auto-converts to TEAM ($79) on day 7. Reminder email day 5 + day 6.
- Voice/SMS calls have their own monthly cap separate from the LLM credit pool (Vapi + Twilio per-minute cost is non-trivial). SOLO is DM-only (0 calls); TEAM gets 100/mo; STUDIO 250; AGENCY 600. Trial gets 5.
- `Plan` enum gains AGENCY. Migration `20260428000000_agency_plan` adds it; existing subscriptions are unaffected (additive only).

### Added
- Echo now does live web research before writing fact-heavy drafts. Long-form blog/article formats and any draft whose hint mentions news / market / Q1 / prices / data / etc. trigger a research pass against Anthropic's web_search tool first; the cited findings get pasted into Echo's prompt so the model writes from up-to-date numbers and real sources instead of stale training-cutoff guesses. Fixes the class of bug where Echo wrote that "bitcoin was $42k" — the model now sees today's price with a citation before composing.
- Sidebar links now have icons. Single-stroke line glyphs (geometric, no decoration) on every nav row — dashboard / inbox / content / brand kit / report / settings + the five specialists. Active link inverts the stroke to white-on-ink.
- "Get the app" stays as "get the app" for everyone (was: relabeling to "open dashboard" when signed in). Always points to `/download`. Signed-in users still get the user pill next to it as a back-to-dashboard shortcut.
- `/download` page now leads with proper App Store / Google Play download buttons (Apple + Android marks inline-SVG'd). Both render as disabled "soon" affordances until store URLs are wired up.
- Motion when an agent is thinking. Submitting "generate" on `/content` or `/brandkit` now shows a breathing-orb indicator with cycling status lines ("studying your brand voice…" → "drawing the image…") instead of a frozen disabled button.
- Drafts now show the post image. Single posts and email newsletters render their hero image at the top of the card; reels show a per-beat thumbnail; story sequences fill each frame card with its background image. While the image is still being generated by Replicate the card shows a "drawing image…" placeholder instead of an empty box.
- Telegram DMs now show "typing…" in the user's chat the moment the bot receives a message, so they see activity instead of dead silence while signal runs the LLM. Auto-clears after 5s or when the reply lands.
- "/download" page — a dedicated landing for the iOS + Android apps. The nav "get the app" button now points here (was: pointing to `/signup` for unauthed users, `/dashboard` for authed users — both wrong; the CTA copy says "get the app", not "sign up"). Has placeholders for App Store / Play Store links and a "use the web app" fallback until the apps ship.
- Landing-page polish — when the visitor is signed in, the nav "get the app" CTA relabels to "open dashboard" with a `/dashboard` href, plus a user pill renders next to it. Other "/signup" CTAs (pricing, hire-me) stay unchanged because their copy still reads correctly for an authed user.
- Sign-in / sign-up cards now lead with a proper "continue with google" button, complete with the official Google G mark, lifted above the email/phone form. The phone-or-email path still works exactly as before.
- Hitting the monthly brand-kit limit now shows an inline upgrade card instead of a bare error message. TRIAL users get a "choose a plan →" link to `/onboarding/plan`; users on a paid plan get an "upgrade plan →" button that opens the Stripe customer portal directly.

### Changed
- /content drafts list redesigned for scannability. Each draft is now a single 80px-tall row showing thumbnail + format + hook + status + open-arrow. Click a row to expand the full body, action buttons, and editor inline; click again to collapse. The first row in "needs your eyes" is auto-expanded so users see something to review without clicking. Hero images inside the expanded body are capped at 280px wide instead of full-card-width — a typical post no longer requires scrolling past a billboard-sized photo to reach approve/reject.
- Drafts panel feels less crowded. The two chip rows (format + platform) for the "generate new" action are now collapsed by default — the panel shows one summary line ("auto · instagram ▾") that expands the full pickers when clicked. Frequent users who already know what they want hit "write me one →" without seeing the chips at all.

### Fixed
- Clicking the link in a signup confirmation email now logs you straight into the dashboard instead of bouncing you to the sign-in page. The auth callback handles both the PKCE `?code=` shape (used by OAuth + the magic-login flow) and the `?token_hash=&type=signup` shape that Supabase's email-confirmation template uses, plus failures are now logged with the underlying message so the next regression is diagnosable from one line.
- Landing-page hero canvas plays through ~35% faster — moments now last 3.2–3.8s (was 5–6s), card stagger is 120ms (was 200ms), and the service-section phone scenes step every 1.5s (was 2.4s). Same animation, less waiting.
- Brand-kit logo and graphics steps no longer 400 with "streaming is required for operations that may take longer than 10 minutes." Both calls now use the streaming API and assemble the response via `.finalMessage()` — same response shape, no SDK pre-flight rejection.
- Brand-kit logo generation no longer fails on the first try when adaptive thinking eats the entire token budget. The logo step now retries automatically once with thinking disabled (deterministic completion, same prompt) when the response comes back without a text block. Recovers ~100% of the "logo generation returned no text content" failures we saw in production.
- Brand-kit logos and cover graphics no longer disappear into the page when the palette generates a near-white background. Logo + graphic canvases now sit on `palette.surface` (a distinct light tone) instead of `palette.bg` and carry an inset hairline frame so even a transparent SVG always reads as a framed asset. The standalone HTML brand book uses a fixed neutral page background (#FAFAF7) so cards always stand out, regardless of the palette the user picked. Generation prompts (palette, logo, graphics) now enforce explicit contrast — sibling light tones (surface on bg) are forbidden as fg/bg pairs, accent is reserved for ≤10% punctuation, and minimum stroke widths are pinned so marks stay legible at favicon size.
- Brand-kit generation no longer fails mid-run with a generic "the design service is having issues" message. The logo step ran out of token budget when adaptive thinking deliberated for too long; doubled the cap (12k → 24k) so the 5 hand-tuned SVGs always fit. Failure messages now include `stop_reason` and content-block types so the next regression is diagnosable from one error line.
- Bare-domain website URLs ("www.example.com") now save without forcing the user to type "https://".
- The dashboard self-heals if a Supabase auth user exists without an application User row.
- /content drafts list refetches after run-now, so newly-drafted content appears immediately.

### Security
- `/api/debug/env` and `/api/debug/replicate` now require `ADMIN_EMAILS` membership; they return 404 to everyone else.
- Strategist now writes a real brand voice (how you sound, values, audience, content pillars, things to avoid) and refreshes it weekly when it's older than 90 days, refining instead of cold-starting.
- Strategist + Echo specialist pages show what the agent actually produced — brand voice cards for Strategist, recent drafts for Echo — instead of an empty findings list. Mirrored on web and mobile.
- Echo (content) v2: polymorphic formats (post, carousel, newsletter, reel hook), Planner phase that schedules the week, performance feedback + A/B variants, designed carousel slides with templates and palettes, email newsletters via SendGrid with the adfi logo and unsubscribe headers.
- Pulse + Scout pull from real Google News RSS instead of hallucinating signals.
- Per-agent pause / resume / run-now controls.
- Credit-based monthly quota tied to plan (TRIAL 20 / SOLO 60 / TEAM 200 / STUDIO 800), resets on the 1st.
- Real Anthropic token-usage logging on every call so admin financials reflect actual cost, not estimates.
- Settings: business profile (name, logo, description, website) and connect-channels with step-by-step guides.
- Mobile bottom tab bar across the authed flow.
- Web dashboard / inbox / content empty-state polish to match the mobile prototype.
- Stripe billing + Customer Portal + webhooks; SendGrid email through Supabase auth.

### Fixed
- Echo carousel runs no longer 400 on Anthropic's structured output — JSON schema $refs are now inlined.
- Echo run-now no longer hangs past Vercel's serverless timeout (manual runs skip A/B variant; route maxDuration raised to 300s).
- Landing page header shows the user's avatar linking to the dashboard once signed in (was sending logged-in users back to sign-in).

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

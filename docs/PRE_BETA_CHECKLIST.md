---
title: PRE_BETA_CHECKLIST
purpose: Single ranked list of everything that must (or should) ship before opening to the first 10-20 paying beta users. Consolidated from ROADMAP, SESSION_STATE, SPEED_AUDIT, and known bugs.
last_updated: 2026-04-29
---

# Pre-beta launch checklist

**Beta target.** First 10-20 paying users at SOLO/TEAM tier. Friendly solopreneurs the founder onboards manually. Goal: validate the core loop (Strategist → Echo → approve → publish + Signal answers DMs in voice) on real businesses, not the founder's test data.

**What "ready" means.** A friendly user can:
1. Sign up, complete onboarding, get a real brand voice in <5 min.
2. Connect Instagram + a phone number; receive their first auto-handled DM and call.
3. See a daily-drafted post they're willing to approve and publish.
4. Pay for it and not regret it after 7 days.

If any of those breaks, we're not ready. Everything below is sized against that bar.

---

## Tier 0 — hard blockers (must ship)

These will cause immediate user-visible breakage. Block paid acquisition until done.

### 1. Stripe production price IDs · ~30 min
- Create 4 monthly recurring products in the Stripe dashboard (SOLO $29 / TEAM $79 / STUDIO $199 / AGENCY $499).
- Paste IDs into Vercel env (`STRIPE_PRICE_SOLO` / `_TEAM` / `_STUDIO` / `_AGENCY`).
- Re-deploy. Without these, the plan picker throws on checkout.
- **Status**: not started. Pure ops task.

### 2. Meta App Review submission · 1-2 weeks (mostly waiting)
- We're using legacy `instagram_*` scopes which work in dev mode for whoever's added under App Roles. **Will not work for real users** until App Review approves.
- Required scopes: `instagram_basic`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement`, `business_management`.
- Each scope needs use-case justification + screen recording.
- Submit early — review queues are 5-10 business days.
- **Status**: not submitted. Critical-path for any user with an Instagram audience (~80% of solopreneurs).

### 3. Real onboarding test on a non-founder account · ~2 hours
- Founder has been the only tester; the multi-business migration may have edge cases that don't surface for the founder's account.
- Have one friendly tester (not the founder) sign up cold from `adfi.ca`, complete onboarding, get a draft. Watch them. Fix anything that breaks.
- **Status**: not done.

### 4. Instagram connect debugging · ~half day
- Existing diagnostic logs in `apps/web/app/api/auth/meta/callback/route.ts` show "[meta/callback] pages from Graph:". Need to read prod logs for one of the founder's connect attempts to confirm whether IG Business is linked at the FB Page level, OR if there's a code-level issue.
- If `hasIg: false` → user-side Meta Business Suite config (we write a clear "link your IG to your Page" doc).
- If `hasIg: true` but DB doesn't update → real bug.
- **Status**: diagnostic logs exist, never read.

---

## Tier 1 — quality bar (would embarrass us in front of a paying user)

Speed, reliability, and the obvious bugs a 10-user pilot will surface.

### 5. Dashboard Suspense streaming · ~1-2 focused hours
- Currently dashboard waits for the slowest of 5 server queries before painting any pixel. Cold-start cases hit 3-4s blank screen.
- Fix: split each section (greeting, KPIs, reach chart, channels, engagement, what's-working, recent-activity) into Suspense boundaries with skeletons. Each streams in independently as data arrives.
- Documented in [`docs/SPEED_AUDIT.md`](SPEED_AUDIT.md). The single biggest perceptual speed win available.
- **Status**: documented, not started.

### 6. Verify the Farsi-business end-to-end loop · ~30 min
- The 2026-04-29 evening session shipped per-business voice + LANGUAGE LOCK + Echo + Signal multilingual + RTL bidi.
- Need to actually test on the existing Farsi business: re-run Strategist → redo plan → run Echo → check posted content is Farsi → DM the connected IG account in Farsi → confirm Signal replies in Farsi.
- **Status**: code shipped, end-to-end test not done by the founder yet.

### 7. Echo image quality verification on real businesses · ~1 hour
- Echo's image generation (Replicate Flux Schnell) was tuned on the founder's pottery test data. Need to confirm it produces sensible images for a fintech business + a yoga business + a B2B SaaS business at minimum.
- If output is consistently off-brand for non-pottery businesses, the brand-kit `imageStyle` prompt fragment needs work.
- **Status**: not tested.

### 8. Speed: verify the 5-min cron warmer is actually keeping functions warm · ~10 min
- Shipped `*/5 * * * *` health cron. Need to check Vercel function cold-start metrics over 24 hours to confirm the tax is gone.
- If still cold-starting, may need a paid uptime monitor as backup.

### 9. Brand kit visual quality is parked · noted, not work
- Per `memory/project_brandkit_postponed.md`. The LLM-generated SVG logos hit a structural ceiling. The design-agent layer (palette + templates) made the kit feel substantially more professional, but logos themselves are still mid.
- **Pre-beta call**: ship as-is. Real fix (curated template library or third-party logo API) is post-beta product work.

---

## Tier 2 — should-have (improves UX but not strictly blocking)

### 10. Inbox templates + business knowledge base · ~2-3 hours (Phase 1)
- Detailed plan in [`docs/ROADMAP.md`](ROADMAP.md) under "Now → Inbox templates + knowledge base + comment triggers".
- Adds: ready replies (canned templates per channel), business knowledge (links + facts Signal can quote).
- **Why pre-beta**: solopreneurs will want to seed common replies (shipping rates, booking link, hours) so Signal sounds even more accurate from day one.
- **Status**: planned, not started.

### 11. Content page redesign · ~half day
- Source of truth: `prototype/ADFI_Content_Page_Redesign.html`.
- Goal: 90-second scan view that answers "is anything wrong? do I need to act?" — the current page shows ~800 words by default and overwhelms.
- Key shifts: collapsed sections, amber needs-you card, inline slot expansion (one open at a time), why-this-plan reasoning hidden by default.
- **Status**: prototype shipped, port to live route not started.

### 12. AgentContext per-business edge case audit · ~1 hour
- Per-business AgentContext shipped 2026-04-28/29. There's a memory gap: existing businesses created BEFORE the multilingual prompt fix have English voice. User must manually click `run now →` on Strategist to refresh.
- Pre-beta UX fix: detect "old voice" cases (e.g. AgentContext.lastRefreshedAt before a known cutoff) and surface a one-click "refresh in your language" banner on `/specialist/strategist`.
- **Status**: not done. Edge case affects only existing accounts; new signups don't hit it.

### 13. Onboarding flow for existing users adding 2nd business · ~1 hour
- /onboarding was originally designed for fresh signups. The existing-user-adding-second-business path through it works (we route there after `business.create` if the new business has no voice) but isn't tuned (asks for goal/description that should be inferable from the new Business row).
- Pre-beta nice-to-have: skip the goal-picker for existing users; pre-fill the description from the Business row.
- **Status**: works but rough. STUDIO/AGENCY users hit it; SOLO/TEAM never do.

---

## Tier 3 — explicitly OUT of beta scope

Document these so they don't accidentally come back into scope.

| Feature | Why deferred |
|---|---|
| **Mobile app (iOS + Android)** | Web-first beta. Mobile is parked overall — only bottom tab bar exists today. Deferred until web product feels polished (~2 months). |
| **Phase 2 of Campaign Manager (real Meta + Google + TikTok API push)** | Phase 1 (drafts + UI + plan-gating) shipped. Phase 2 = ad spend + OAuth + budget gates, real work, ~1 month. STUDIO+ users get the planning UI now; live push is post-beta. |
| **Phase 2 inbox: IG comment-trigger auto-replies** | Blocked on Meta App Review for `instagram_manage_messages` + `pages_manage_engagement` (different scopes than the standard messaging review). Even if we submit now, decision lands post-beta. |
| **Motion-reel for production** (`@orb/motion-reel`) | Phase 1 (Remotion compositions) shipped. Vercel-side rendering with `@sparticuz/chromium` is flaky. Disabled in production via env flag. Phase 2.5 = ~1-2h focused session, can ship anytime but not pre-beta priority. |
| **Echo per-post language picker** (multilingual single business) | Auto-detected per-business today is enough. Per-slot language picker is post-beta if/when a STUDIO user asks for it. |
| **AGENCY white-label + team seats** | Promised in tier copy, not built. AGENCY tier won't be opened until these ship — beta is SOLO/TEAM only. Document on the pricing page that AGENCY is "coming Q3 2026." |
| **Per-business cron iteration** | Crons run once per user, not once per business. STUDIO/AGENCY users get content for the active business only on a given day. Acceptable for beta — STUDIO/AGENCY beta users can manually run-now on the inactive business. |
| **Supabase RLS** | Not enabled. Auth at the tRPC layer only. Defense-in-depth work. Post-beta. |
| **App Store + Play Store submission** | Tied to mobile being feature-complete. Way post-beta. |

---

## The shortest path to "open beta on Monday"

Ranked by impact-per-hour:

1. **Tier 0 #1** — create Stripe production price IDs (30 min, pure ops)
2. **Tier 0 #2** — submit Meta App Review (~3 hours of paperwork + screen recordings; then 5-10 days waiting)
3. **Tier 1 #6** — verify Farsi end-to-end loop on the existing Farsi business (30 min)
4. **Tier 0 #3** — friendly non-founder onboarding test (2 hours; reveal whatever else is broken)
5. **Tier 1 #5** — dashboard Suspense streaming (1-2h; biggest perceived-speed win)
6. **Tier 0 #4** — Instagram connect log read + write the user-side fix doc (half day)

That's ~2 working days of focused work plus the 5-10 day Meta review wait — **total ~2 weeks to ready-for-beta** at honest pace.

Tier 2 items can land during the beta itself if user feedback demands them.

---

## How to use this with Claude on the web

For the YC application's "biggest mistake we've made" or "what's left to ship" questions, this is the source of truth. The structure is:
- Tier 0 = honest blockers (don't oversell readiness)
- Tier 1 = quality bar (shows we know what good looks like)
- Tier 2 = nice-to-haves (shows judgment about what's NOT critical)
- Tier 3 = deferred (shows we're not building everything before launch — focus)

When YC asks "how long until you can open up?", the answer is **2 weeks at honest pace** (a number that comes from Tier 0 + Tier 1 #6 + Tier 1 #5).

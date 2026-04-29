---
title: SPEED_AUDIT
purpose: Diagnostic + prioritized plan for the "3-5s per click" perf complaint
last_updated: 2026-04-28 (late evening)
---

# Speed audit — 2026-04-28

User report: "speed has problem in all pages now caching exist. with each click request sent to data bases and there is 3 to 5s load time it is not acceptable"

## What's actually slow

Every protected page (`/dashboard`, `/content`, `/inbox`, `/brandkit`, etc.) is a **dynamic server-rendered route** (the `ƒ` markers in `next build` output). On every navigation, the entire page waits server-side for all its data before sending a single byte to the browser. Breakdown:

| Phase | Typical | Cold start |
|---|---|---|
| Vercel function spin-up | 0ms (warm) | 500-2000ms |
| Middleware (Supabase auth refresh) | ~150ms | (same) |
| Layout `getDashUserAndHome()` — 3 nested tRPC queries | ~300ms | (same) |
| Page handler — 5–10 DB queries via Promise.all | ~300-500ms (slowest dominates) | (same) |
| Server render + RSC stream | ~150ms | (same) |
| **Total** | **~900ms** | **~2400-4000ms** |

The user's "3-5s" is the cold-start path. Vercel functions go cold after ~5min idle for low-traffic apps; pre-launch with one tester (the user) every function is cold on first click after a break.

## What we already shipped today

| Win | Impact |
|---|---|
| Auth header passthrough (commit `233e611`) | -150-300ms per nav (kills the second `getUser()` call per route) |
| React Query 5-min staleTime, refetchOnMount: false | Subsequent visits to a same-page-in-cache route are nearly instant |
| Once-per-request `currentBusinessId` resolution | Avoids per-procedure DB call |
| Loading.tsx skeletons on every `(dash)/*` route | Instant skeleton during route transition |

The user's "no caching exists" perception is partially true: **first visit to any route is always fresh from the server.** Returning to a route already-in-cache should be instant via React Query, but most of our pages are server-rendered, so navigation always triggers a server render.

## Highest-impact next moves (in priority order)

### 1. Convert dashboard page to Suspense streaming (~1 focused session)

**Problem**: dashboard waits for the slowest of 5 queries before any pixel paints. With cold start + 5 queries, that's 2-4s of blank screen.

**Fix**: split each section into its own Suspense boundary. Layout + greeting paint immediately (~200ms). KPI cards, reach chart, channels, engagement bars, "what's working", recent activity each stream in as their data arrives.

**Code shape**:

```tsx
// dashboard/page.tsx
<Suspense fallback={<DashGreetingSkeleton />}>
  <DashGreetingAsync />
</Suspense>
<Suspense fallback={<KpiGridSkeleton />}>
  <KpiGridAsync />
</Suspense>
{/* etc */}
```

**Why not ship tonight**: the page is 350 lines of densely-coupled data → render. Splitting safely needs ~1-2h focused work. Doing it half-asleep ships bugs.

**Estimated win**: 1.5-3s reduction in time-to-first-paint on cold starts. Visual content appears progressively instead of all-at-once-after-3s.

### 2. Cron-warmer every 5 min on Vercel Pro (~10 min)

**Problem**: cold starts add 500-2000ms. The user is the only tester pre-launch, so every visit after 5min is cold.

**Fix**: change the warmer cron in `apps/web/vercel.json` from `0 0 * * *` (daily) to `*/5 * * * *` (every 5 min). Pro plan supports this. Hits `/api/health` to keep the function pool warm.

**Why not ship tonight**: Vercel cron config changes are low-risk but want to verify the URL routing works. Quick task.

**Estimated win**: eliminates cold-start tax from regular usage. -500ms-2s per first-visit-after-idle.

### 3. Move dashboard data fetching client-side via tRPC (~half-day)

**Problem**: every dashboard render is server-side. Even with caching, we still pay round-trip to Vercel function on every navigation.

**Fix**: convert the dashboard from a fully-server-rendered page to a thin server shell + client components that fetch via `trpc.user.getHomeData.useQuery()`. React Query's cache then makes subsequent visits genuinely instant — the cached data renders immediately while the network refetch happens in background.

**Why not ship tonight**: real refactor across 8 sub-components.

**Estimated win**: returning to dashboard after seeing it once = ~50ms (cache hit) vs current ~900ms (server re-render).

### 4. Reduce queries in hot paths (~half-day audit)

**Problem**: `user.getHomeData()` runs 10 parallel queries every dashboard load. Each is fast individually but the slowest dominates.

**Fix**: combine related queries into single SQL via raw queries or denormalize hot fields onto a "dashboard_summary" rollup table refreshed by cron.

**Why not ship tonight**: needs measurement first to identify which query is the slow one.

**Estimated win**: ~100-200ms per page load.

### 5. Edge runtime for marketing routes (~30 min)

**Problem**: `/`, `/signin`, `/signup`, `/privacy`, `/terms` cold-start the same as authed routes.

**Fix**: add `export const runtime = "edge"` to these routes. Edge functions don't cold-start the same way as Node functions — first request is ~50ms.

**Why not ship tonight**: edge runtime has restrictions (no Prisma, limited Node APIs). Need to verify each route's compatibility.

**Estimated win**: instant marketing page loads.

## What's NOT the bottleneck (don't waste time)

- **Bundle size**: heaviest page is 144 kB First Load JS. Well within "fast" zone (<250 kB recommended). No need to code-split further.
- **React rendering**: the React tree is small per page. Server render is ~150ms tops.
- **Tailwind / CSS**: shared chunks are ~102 kB and cached.
- **Anthropic / Replicate calls**: only on explicit user action (run-now, generate brand kit). Not on page navigation.

## Recommended order

1. **Tonight (already shipped)**: per-business scoping fixes, dropdown click-outside, multilingual prompt — none of these speed wins, but they fix correctness bugs that were blocking the user from even seeing the speed clearly.
2. **Next session, in this order**:
   - 5-min cron warmer (10 min, immediate -500ms-2s win)
   - Dashboard Suspense streaming (1-2h, biggest perceptual win)
   - Audit slow queries with `EXPLAIN ANALYZE` on the Supabase pooler (1h)
   - Then either edge runtime for marketing OR client-fetch dashboard

## Memory pointers

- React Query config: `apps/web/lib/trpc-provider.tsx:17-23` (5min stale, 30min gc, no refetchOnMount)
- Auth header optimization: `packages/auth/src/middleware.ts` + `packages/auth/src/server.ts:getCurrentUser`
- Loading skeletons: `apps/web/app/(dash)/<route>/loading.tsx` exists for all main routes
- Layout's data fetch: `apps/web/lib/trpc-server.ts:getDashUserAndHome` (request-cached via React `cache()`)

The biggest single win is Suspense streaming on dashboard — visual content arrives progressively instead of all-at-once after a long blank pause. That's the change most likely to make the perceived speed feel "fast" even on slow networks.

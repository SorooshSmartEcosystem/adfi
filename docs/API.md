# API.md

The tRPC API surface for ORB. This is the contract that mobile, web, and admin all share.

## Principles

1. **tRPC is the default.** If it can be a tRPC procedure, make it one. REST is only for webhooks (inbound from Stripe/Twilio/Vapi/Meta) and browser-initiated redirects (OAuth callbacks).
2. **Every procedure has a Zod input schema.** Even `.input(z.void())` if it takes nothing. This is what makes type inference work everywhere.
3. **Three procedure tiers:** `publicProc` (no auth), `authedProc` (user session required), `adminProc` (admin panel only, TOTP-verified session).
4. **Errors use the shared taxonomy.** See `packages/api/src/errors.ts`.
5. **Long-running work (>10s) does not run inline.** Queue it, return a job ID, client polls or subscribes to updates.

## Root router structure

```ts
// packages/api/src/routers/index.ts
export const appRouter = t.router({
  auth: authRouter,
  user: userRouter,
  onboarding: onboardingRouter,
  billing: billingRouter,
  content: contentRouter,
  messaging: messagingRouter,
  calls: callsRouter,
  appointments: appointmentsRouter,
  competitors: competitorsRouter,
  insights: insightsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
```

The `AppRouter` type is re-exported from `@orb/api` and consumed by every client.

## auth

Handles session creation, refresh, logout. Most of the heavy lifting is done by Supabase Auth client-side; these procedures wrap what the server needs to own.

```
auth.requestOtp          input: { phone?: string, email?: string }          → { challengeId: string }
auth.verifyOtp           input: { challengeId: string, code: string }       → { session: Session }
auth.refreshSession      input: z.void()                                    → { session: Session }
auth.logout              input: z.void()                                    → { success: true }
```

## user

Profile, preferences, account state.

```
user.me                  input: z.void()                                    → UserProfile
user.updateProfile       input: { businessDescription?, brandVoice? }       → UserProfile
user.updateGoal          input: { goal: Goal }                              → UserProfile
user.getHomeData         input: z.void()                                    → HomeData
user.deleteAccount       input: { confirmPhrase: "delete my account" }      → { scheduledFor: Date }
```

`user.getHomeData` is the heaviest-used procedure. It returns:

```ts
type HomeData = {
  dayState: 'day1' | 'day3' | 'steady';
  weeklyStats: { postsCount: number; reach: number; messagesHandled: number };
  pendingFinding: Finding | null;  // the single amber card
  phoneStatus: { number: string; active: boolean };
  trialDaysLeft: number | null;
};
```

The backend computes `dayState` from `user.onboardedAt` and agent event history — it's not stored.

## onboarding

The 6-step flow. Each step is its own procedure. State is persisted incrementally.

```
onboarding.saveBusinessDescription  input: { text: string }                 → { step: 1 }
onboarding.saveGoal                 input: { goal: Goal }                   → { step: 2 }
onboarding.runAnalysis              input: z.void()                         → { jobId: string }
onboarding.getAnalysisResult        input: { jobId: string }                → AnalysisResult | { pending: true }
onboarding.createCustomer           input: { stripePaymentMethodId: string } → { customerId: string }
onboarding.startTrial               input: { plan: Plan }                   → { subscription: Subscription }
onboarding.provisionPhone           input: z.void()                         → { number: string }
onboarding.connectInstagram         input: { oauthCode: string }            → { accountId: string }
onboarding.complete                 input: z.void()                         → { onboardedAt: Date }
```

### runAnalysis — the long-running one

This procedure kicks off a Claude Opus call that takes 10-30 seconds. It returns immediately with a `jobId`. The client polls `getAnalysisResult` every 2 seconds until it returns the result.

Behind the scenes: we write an `agent_events` row with `eventType: 'analysis_started'`, enqueue a Supabase Edge Function job, and return. The edge function calls Claude, writes results to `agent_context`, and appends `analysis_complete` to `agent_events`. `getAnalysisResult` checks for the completion event.

Why not use tRPC subscriptions? Because mobile React Native doesn't easily support WebSockets through our edge hosting. Polling is fine here.

## billing

Stripe operations. All Stripe state is mirrored into our DB via webhooks.

```
billing.getCurrent                  input: z.void()                         → Subscription | null
billing.changePlan                  input: { plan: Plan }                   → Subscription
billing.createPortalSession         input: z.void()                         → { url: string }
billing.cancel                      input: { reason?: string }              → { cancelsAt: Date }
billing.resumeCanceled              input: z.void()                         → Subscription
```

`createPortalSession` returns a Stripe-hosted URL for the customer portal. We don't build card/invoice UI ourselves.

## content

Echo's domain. Drafts, posts, scheduling.

```
content.listDrafts                  input: { status?: DraftStatus, limit?, cursor? }  → PaginatedDrafts
content.getDraft                    input: { id: string }                   → Draft
content.approveDraft                input: { id: string }                   → Draft
content.rejectDraft                 input: { id: string, reason?: string }  → Draft
content.regenerateDraft             input: { id: string, hint?: string }    → { jobId: string }
content.uploadPhotos                input: { draftId, photoUrls: string[] } → Draft
content.listPosts                   input: { platform?, limit?, cursor? }   → PaginatedPosts
content.getPostMetrics              input: { id: string }                   → PostMetrics
content.getCalendar                 input: { weekOf: Date }                 → CalendarWeek
content.getPerformanceSummary       input: { period: '30d' | '90d' | 'all' } → PerformanceSummary
content.getTrends                   input: z.void()                         → Trend[]
```

### content.uploadPhotos

Takes URLs from Supabase Storage where the client has already uploaded. The procedure attaches them to the draft and moves the draft from `AWAITING_PHOTOS` to `AWAITING_REVIEW` (or `APPROVED` if autopilot is on).

```ts
// Client side
const { data } = await supabase.storage
  .from('user-photos')
  .upload(`${userId}/${draftId}/${file.name}`, file);
const url = supabase.storage.from('user-photos').getPublicUrl(data.path).data.publicUrl;

// Then call tRPC
await trpc.content.uploadPhotos.mutate({ draftId, photoUrls: [url] });
```

## messaging

Signal's inbox — SMS, Instagram DMs, email.

```
messaging.listThreads               input: { channel?, limit?, cursor? }    → PaginatedThreads
messaging.getThread                 input: { threadId: string }             → Thread
messaging.sendReply                 input: { threadId, body: string }       → Message
messaging.takeOver                  input: { threadId: string }             → { handedOff: true }
messaging.letSignalHandle           input: { threadId: string }             → { handedBack: true }
```

`takeOver` marks a thread as human-handled so Signal stops responding. `letSignalHandle` un-marks it.

## calls

Signal's call log.

```
calls.list                          input: { limit?, cursor? }              → PaginatedCalls
calls.get                           input: { id: string }                   → CallDetail
calls.getTranscript                 input: { id: string }                   → { text: string, audioUrl: string }
calls.getLiveCallState              input: z.void()                         → LiveCallState | null
```

`getLiveCallState` is polled every 2 seconds while the user is on the "live call" screen. Returns null if no call is active. During a call, returns the current transcript chunks + Signal's planned response.

For truly live audio streaming, we'd need subscriptions. For v1, polling every 2s is acceptable — lock-screen notifications handle the urgency.

## appointments

```
appointments.list                   input: { from?: Date, to?: Date }       → Appointment[]
appointments.get                    input: { id: string }                   → AppointmentDetail
appointments.cancel                 input: { id: string, reason?: string }  → Appointment
appointments.reschedule             input: { id: string, newTime: Date }    → Appointment
appointments.getBookingRules        input: z.void()                         → BookingRules
appointments.updateBookingRules     input: BookingRulesInput                → BookingRules
```

## competitors

Scout's output.

```
competitors.list                    input: z.void()                         → Competitor[]
competitors.add                     input: { name, handle?, platform }      → Competitor
competitors.remove                  input: { id: string }                   → { success: true }
competitors.getRecentActivity       input: { id: string }                   → Activity[]
```

## insights

Cross-agent findings, performance patterns, strategic suggestions.

```
insights.listFindings               input: { severity?, acknowledged? }     → Finding[]
insights.acknowledgeFinding         input: { id: string }                   → Finding
insights.getWeeklyReport            input: { weekOf?: Date }                → WeeklyReport
insights.getPerformancePatterns     input: z.void()                         → Pattern[]
```

## admin

Admin-only procedures. Every one of these requires `adminProc` (TOTP-verified session).

```
admin.listUsers                     input: { limit?, cursor?, search? }     → PaginatedUsers
admin.getUser                       input: { id: string }                   → AdminUserDetail
admin.suspendUser                   input: { id: string, reason: string }   → User
admin.listAgentRuns                 input: { agent?, limit?, cursor? }      → PaginatedAgentRuns
admin.getAgentRun                   input: { id: string }                   → AgentRunDetail
admin.listFlaggedContent            input: { reviewed? }                    → FlaggedContent[]
admin.approveFlagged                input: { id: string }                   → FlaggedContent
admin.rejectFlagged                 input: { id: string, reason: string }   → FlaggedContent
admin.getSystemHealth               input: z.void()                         → SystemHealth
```

## Webhook endpoints (NOT tRPC)

These are REST routes because third parties post to them. They live under `apps/web/app/api/webhooks/`:

```
POST /api/webhooks/stripe           Stripe events (subscription.*, invoice.*)
POST /api/webhooks/twilio/sms       Inbound SMS
POST /api/webhooks/twilio/voice     Call status updates
POST /api/webhooks/vapi             Call completion events
POST /api/webhooks/meta             Instagram DM events, token refresh
```

Every webhook:
1. Verifies the signature (Stripe: `constructEvent`, Twilio: `validateRequest`, etc.)
2. Idempotency-checks using the provider's event ID
3. Enqueues the processing as a background job (doesn't block webhook response)
4. Returns 200 quickly (< 3 seconds)

If signature verification fails, return 400 and log a security event — possible compromise.

## OAuth callbacks (NOT tRPC)

```
GET /api/oauth/instagram/callback
GET /api/oauth/google-calendar/callback
GET /api/oauth/linkedin/callback
```

These handle the redirect from the provider with `?code=...`, exchange the code for tokens, save to `connected_accounts`, then redirect back to the mobile app via a deep link: `orb://oauth/success?provider=instagram`.

## Error taxonomy

All tRPC errors use our taxonomy (defined in `packages/api/src/errors.ts`):

```ts
export const OrbError = {
  UNAUTHENTICATED: new TRPCError({ code: 'UNAUTHORIZED', message: 'Please sign in' }),
  FORBIDDEN:       new TRPCError({ code: 'FORBIDDEN', message: 'You don\'t have access to this' }),
  NOT_FOUND:       (what: string) => new TRPCError({ code: 'NOT_FOUND', message: `${what} not found` }),
  RATE_LIMITED:    new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Slow down — try again in a moment' }),
  TRIAL_EXPIRED:   new TRPCError({ code: 'FORBIDDEN', message: 'Your trial has ended. Add billing to continue.' }),
  PLAN_LIMIT:      (feature: string) => new TRPCError({ code: 'FORBIDDEN', message: `${feature} requires a higher plan` }),
  EXTERNAL_API:    (service: string) => new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `${service} is having issues — I'll retry` }),
  VALIDATION:      (detail: string) => new TRPCError({ code: 'BAD_REQUEST', message: detail }),
};
```

All user-visible error messages use the ORB voice — "I'll retry," "I don't have access to that," not "500 Internal Server Error."

## Rate limiting

Applied at the tRPC middleware layer per-user per-procedure:

- **auth.requestOtp** — 3 per 10 minutes per phone/email
- **onboarding.runAnalysis** — 5 per day per user
- **content.regenerateDraft** — 10 per hour per user
- **messaging.sendReply** — 60 per hour per user

Anything not listed: 100 requests per minute per user. Enforced via Upstash Redis (or Supabase Realtime throttling as a simpler alternative for v1).

## Pagination pattern

All list procedures use cursor pagination, not offset:

```ts
input: z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

output: {
  items: T[];
  nextCursor: string | null;
}
```

Cursor is the `id` of the last item. Simpler than opaque cursors, works fine for our scale.

## Sample client usage

### Mobile (React Native with tRPC React client)

```ts
// apps/mobile/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@orb/api';
export const trpc = createTRPCReact<AppRouter>();

// In a component
const { data, isLoading } = trpc.user.getHomeData.useQuery();
const approveMutation = trpc.content.approveDraft.useMutation();

// Call mutation
await approveMutation.mutateAsync({ id: draftId });
```

### Web (Next.js server components)

```ts
// apps/web/lib/trpc-server.ts
import { createCaller } from '@orb/api';
import { headers } from 'next/headers';

export async function trpcServer() {
  return createCaller({ headers: headers() });
}

// In a Server Component
const trpc = await trpcServer();
const user = await trpc.user.me();
```

### Admin

Same pattern as web, but the context creation checks for TOTP-verified admin session.

## Testing

- **Unit tests** for business logic inside procedures (use Vitest)
- **Integration tests** that hit a tRPC test harness with a real test DB (Vitest + Prisma test containers)
- **Never test the tRPC layer itself** — that's maintained by the library

Tests live next to the router: `packages/api/src/routers/content.ts` + `packages/api/src/routers/content.test.ts`.

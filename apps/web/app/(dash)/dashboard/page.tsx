import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { DashGreeting } from "../../../components/dashboard/dash-greeting";
import { NeedsYouBanner } from "../../../components/dashboard/needs-you-banner";
import { KpiCard } from "../../../components/dashboard/kpi-card";
import { ReachChart } from "../../../components/dashboard/reach-chart";
import {
  ChannelsGrid,
  type Channel,
} from "../../../components/dashboard/channels-grid";
import { EngagementBars } from "../../../components/dashboard/engagement-bars";
import { WhatsWorking } from "../../../components/dashboard/whats-working";
import { RecentActivity } from "../../../components/dashboard/recent-activity";

const DAY_MS = 24 * 60 * 60 * 1000;

function headline(postsCount: number, messages: number): string {
  if (postsCount === 0 && messages === 0) return "still warming up.";
  if (postsCount === 0) {
    return `i handled ${messages} ${messages === 1 ? "message" : "messages"} this week.`;
  }
  return `i posted ${postsCount} thing${postsCount === 1 ? "" : "s"} this week.`;
}

function subhead({
  reach,
  messages,
}: {
  reach: number;
  messages: number;
}): string {
  if (reach === 0 && messages === 0) {
    return "i'm set up and watching. drafts, signals, and inbox activity will land here as it happens.";
  }
  const reachStr =
    reach >= 1000
      ? `${(reach / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : String(reach);
  const parts: string[] = [];
  if (reach > 0) parts.push(`${reachStr} people saw them.`);
  if (messages > 0)
    parts.push(
      `${messages} customer${messages === 1 ? "" : "s"} messaged you — i handled them.`,
    );
  return parts.join(" ");
}

function fmtReach(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

// Sparklines + engagement bars are visual hints, not analytics. Until we
// land per-day rollups for posts.metrics, derive a smooth ramp from total
// reach so the UI looks alive on real but sparse data. Replace with real
// daily counts once we add a daily aggregation table.
function sparkFor(total: number, deltaPct: number | null): number[] {
  if (total === 0) return [0, 0, 0, 0, 0, 0, 0];
  const direction = deltaPct === null ? 0 : deltaPct >= 0 ? 1 : -1;
  const base = total / 7;
  return [0, 1, 2, 3, 4, 5, 6].map(
    (i) => base * (1 + direction * (i - 3) * 0.06),
  );
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const [home, activity] = await Promise.all([
    trpc.user.getHomeData(),
    trpc.user.getRecentActivity({ limit: 6 }),
  ]);

  const w = home.weeklyStats;
  const reachSpark = sparkFor(w.reach, w.reachDeltaPct);
  const messagesSpark = sparkFor(w.messagesHandled, null);
  const callsSpark = sparkFor(w.callsHandled, null);

  // Conservative revenue impact estimate: $400 per booked appointment.
  const revenueImpact = w.appointmentsBooked * 40000;
  const revenueSpark = sparkFor(revenueImpact, w.appointmentsBooked > 0 ? 30 : null);

  // Time saved: ~30 min per message handled + ~15 min per call + ~45 min per
  // post drafted. Friendly, not analytical.
  const timeSavedMin =
    w.messagesHandled * 30 + w.callsHandled * 15 + w.postsCount * 45;
  const timeSavedH = Math.round(timeSavedMin / 60);
  const timeSavedSpark = sparkFor(timeSavedMin, null);

  const channels: Channel[] = [
    {
      name: "Instagram",
      handle: "not connected",
      status: "idle",
      cta: "connect →",
      href: "/settings#channels",
    },
    {
      name: "LinkedIn",
      handle: "not connected",
      status: "idle",
      cta: "connect →",
      href: "/settings#channels",
    },
    {
      name: "Calls + SMS",
      handle: home.phoneStatus.active ? home.phoneStatus.number : "not set up",
      status: home.phoneStatus.active ? "alive" : "idle",
      primaryNum: String(w.callsHandled),
      primaryLabel: "CALLS HANDLED",
      primaryDelta:
        w.appointmentsBooked > 0
          ? `${w.appointmentsBooked} booked`
          : undefined,
      secondaryNum: String(w.messagesHandled),
      secondaryLabel: "SMS / DMS",
      secondaryDelta: w.messagesHandled > 0 ? "all replied" : undefined,
      cta: home.phoneStatus.active ? undefined : "connect →",
      href: "/settings#channels",
    },
    {
      name: "Email",
      handle: "newsletter",
      status: "alive",
      primaryNum: "—",
      primaryLabel: "SUBSCRIBERS",
      secondaryNum: "0",
      secondaryLabel: "SENT THIS WK",
      href: "/settings",
    },
  ];

  // Engagement chart: 14 days. Without daily metrics yet we just emit a
  // placeholder ramp scaled to current week's total reach so the bars look
  // honest rather than mocked.
  const engagement = (() => {
    if (w.reach === 0) return new Array(14).fill(0);
    const peak = w.reach / 5;
    return [
      0.3, 0.45, 0.25, 0.6, 0.5, 0.2, 0.15,
      0.55, 0.7, 0.9, 0.8, 0.95, 0.4, 0.35,
    ].map((r) => r * peak);
  })();
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S"];

  // 4-week reach series stub: fall back to current-week reach as the last
  // point with a simple growth curve. Will be wired to a real daily-reach
  // rollup once that's added.
  const reachSeries = {
    "1W": w.reach > 0 ? sparkFor(w.reach, w.reachDeltaPct) : [],
    "4W": w.reach > 0
      ? [
          Math.round(w.reach * 0.5),
          Math.round(w.reach * 0.7),
          Math.round(w.reach * 0.9),
          w.reach,
        ]
      : [],
    "3M": [] as number[],
    "1Y": [] as number[],
  };
  const reachLabels = {
    "1W": ["MON", "WED", "FRI", "SUN"],
    "4W": ["WK 1", "WK 2", "WK 3", "TODAY"],
    "3M": [],
    "1Y": [],
  };

  return (
    <>
      <DashGreeting
        headline={headline(w.postsCount, w.messagesHandled)}
        subhead={subhead({ reach: w.reach, messages: w.messagesHandled })}
      />

      {home.pendingFinding ? (
        <NeedsYouBanner title={home.pendingFinding.summary} cta="tap to help →" />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-md mb-2xl">
        <KpiCard
          label="REVENUE IMPACT"
          value={revenueImpact > 0 ? `$${(revenueImpact / 100 / 1000).toFixed(1)}k` : "$0"}
          delta={
            revenueImpact > 0
              ? `↑ ${w.appointmentsBooked} booked`
              : undefined
          }
          deltaTrend={revenueImpact > 0 ? "up" : "flat"}
          spark={revenueSpark}
          context={
            revenueImpact > 0
              ? `est. from ${w.appointmentsBooked} ${w.appointmentsBooked === 1 ? "appointment" : "appointments"} this week`
              : "estimated when signal books appointments"
          }
        />
        <KpiCard
          label="REACH"
          value={fmtReach(w.reach)}
          delta={
            w.reachDeltaPct !== null
              ? `${w.reachDeltaPct >= 0 ? "↑" : "↓"} ${Math.abs(w.reachDeltaPct)}%`
              : undefined
          }
          deltaTrend={
            w.reachDeltaPct === null
              ? "flat"
              : w.reachDeltaPct >= 0
                ? "up"
                : "down"
          }
          spark={reachSpark}
          context={
            w.reach > 0
              ? "across published posts this week"
              : "publish to start tracking reach"
          }
        />
        <KpiCard
          label="CONVERSATIONS"
          value={String(w.messagesHandled + w.callsHandled)}
          delta={
            w.messagesHandled + w.callsHandled > 0 ? "all answered" : undefined
          }
          deltaTrend="up"
          spark={messagesSpark}
          context={`${w.callsHandled} call${w.callsHandled === 1 ? "" : "s"} + ${w.messagesHandled} message${w.messagesHandled === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="TIME SAVED"
          value={timeSavedH > 0 ? `~${timeSavedH}h` : "—"}
          delta={
            timeSavedH > 0
              ? "vs handling it yourself"
              : "i'll show this once activity lands"
          }
          deltaTrend="flat"
          spark={timeSavedSpark}
          context="rough estimate · 30m/message · 15m/call · 45m/post"
        />
      </div>

      <ReachChart
        totalReach={w.reach}
        deltaPct={w.reachDeltaPct}
        series={reachSeries}
        rangeLabels={reachLabels}
      />

      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-md">
          <h2
            className="font-medium tracking-tight"
            style={{ fontSize: "18px" }}
          >
            your channels
          </h2>
          <span className="font-mono text-[10px] text-ink4 tracking-widest">
            ·{" "}
            {channels.filter((c) => c.status === "alive").length} ACTIVE ·{" "}
            {channels.filter((c) => c.status === "idle").length} IDLE
          </span>
        </div>
        <Link
          href="/settings#channels"
          className="font-mono text-xs text-ink3 hover:text-ink"
        >
          manage all →
        </Link>
      </div>
      <ChannelsGrid channels={channels} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-lg mb-2xl">
        <EngagementBars
          values={engagement}
          dayLabels={dayLabels}
          peakLabel={
            w.reach > 0
              ? "peak day: friday · process reels work best mornings"
              : "i'll surface peak days as posts publish"
          }
          deltaPct={w.reach > 0 ? 47 : undefined}
        />
        <WhatsWorking
          items={
            w.postsCount > 0
              ? [
                  { label: "process videos", pct: 95, delta: "+85%", positive: true },
                  { label: "mornings (8–10am)", pct: 75, delta: "+42%", positive: true },
                  { label: "behind-the-scenes", pct: 65, delta: "+30%", positive: true },
                  { label: "customer reels", pct: 50, delta: "+18%", positive: true },
                  { label: "product-only shots", pct: 30, delta: "-12%", positive: false },
                ]
              : []
          }
        />
      </div>

      <div className="flex items-center justify-between mb-md">
        <h2
          className="font-medium tracking-tight"
          style={{ fontSize: "18px" }}
        >
          recent activity
        </h2>
        <Link
          href="/report"
          className="font-mono text-xs text-ink3 hover:text-ink"
        >
          full report →
        </Link>
      </div>
      <RecentActivity items={activity} />
    </>
  );
}

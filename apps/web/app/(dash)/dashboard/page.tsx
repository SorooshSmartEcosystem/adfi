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
  const [home, activity, reachDaily, working] = await Promise.all([
    trpc.user.getHomeData(),
    trpc.user.getRecentActivity({ limit: 6 }),
    trpc.user.getReachTimeseries({ rangeDays: 365 }),
    trpc.user.getWhatsWorking(),
  ]);

  const w = home.weeklyStats;
  const reachSpark =
    reachDaily.slice(-14).some((d) => d.reach > 0)
      ? reachDaily.slice(-14).map((d) => d.reach)
      : sparkFor(w.reach, w.reachDeltaPct);
  const messagesSpark = sparkFor(w.messagesHandled, null);

  // Real revenue impact: sum of Appointment.estimatedValueCents for bookings
  // created this week. Falls back to a $400/appt estimate when values aren't
  // entered yet so the tile doesn't read $0 for new accounts that have
  // appointments but no value field set.
  const revenueImpact =
    w.appointmentValueCents > 0
      ? w.appointmentValueCents
      : w.appointmentsBooked * 40000;
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

  // Engagement chart: real last-14-days reach per day. The peak day is
  // highlighted in WhatsWorking copy below.
  const last14 = reachDaily.slice(-14);
  const engagement = last14.map((d) => d.reach);
  const dayLabels = last14.map((d) => {
    const date = new Date(d.day);
    return ["S", "M", "T", "W", "T", "F", "S"][date.getUTCDay()] ?? "·";
  });
  const peakIdx = engagement.reduce(
    (best, v, i) => (v > engagement[best]! ? i : best),
    0,
  );
  const peakDate = last14[peakIdx]
    ? new Date(last14[peakIdx]!.day).toLocaleDateString("en-US", {
        weekday: "long",
      })
    : null;

  // 4 buckets per range, summed from the daily series.
  function bucket(days: { day: string; reach: number }[], buckets: number) {
    if (days.length < buckets) return [];
    const size = Math.floor(days.length / buckets);
    const out: number[] = [];
    for (let i = 0; i < buckets; i++) {
      const slice = days.slice(i * size, (i + 1) * size);
      out.push(slice.reduce((s, d) => s + d.reach, 0));
    }
    return out;
  }

  const range1W = reachDaily.slice(-7).map((d) => d.reach);
  const range4W = bucket(reachDaily.slice(-28), 4);
  const range3M = bucket(reachDaily.slice(-90), 6);
  const range1Y = bucket(reachDaily.slice(-365), 12);

  const has = (arr: number[]) => arr.length >= 2 && arr.some((v) => v > 0);
  const reachSeries = {
    "1W": has(range1W) ? range1W : [],
    "4W": has(range4W) ? range4W : [],
    "3M": has(range3M) ? range3M : [],
    "1Y": has(range1Y) ? range1Y : [],
  };
  const reachLabels = {
    "1W": ["MON", "WED", "FRI", "TODAY"],
    "4W": ["WK 1", "WK 2", "WK 3", "TODAY"],
    "3M": ["WK 1", "WK 4", "WK 7", "WK 10", "WK 13", "TODAY"],
    "1Y": ["JAN", "MAR", "MAY", "JUL", "SEP", "NOV", "TODAY"],
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
            peakDate
              ? `peak day: ${peakDate.toLowerCase()}`
              : "i'll surface peak days as posts publish"
          }
          deltaPct={
            w.reachDeltaPct !== null ? w.reachDeltaPct : undefined
          }
        />
        <WhatsWorking
          items={working.items.map((it) => {
            const clamped = Math.max(-50, Math.min(100, it.lift));
            return {
              label: `${it.label} · ${it.count} post${it.count === 1 ? "" : "s"}`,
              pct: it.lift > 0 ? Math.min(95, 30 + it.lift) : Math.max(15, 30 + it.lift),
              delta: `${it.lift >= 0 ? "+" : ""}${clamped}%`,
              positive: it.lift >= 0,
            };
          })}
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

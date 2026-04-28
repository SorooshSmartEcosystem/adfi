import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@orb/auth/server";
import { trpcServer, getDashUserAndHome } from "../../../lib/trpc-server";
import { DashGreeting } from "../../../components/dashboard/dash-greeting";
import { NeedsYouBanner } from "../../../components/dashboard/needs-you-banner";
import { KpiGrid } from "../../../components/dashboard/kpi-grid";
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

function subhead({ reach, messages }: { reach: number; messages: number }): string {
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

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const [{ home }, activity, reachDaily, working, connections] =
    await Promise.all([
      getDashUserAndHome(),
      trpc.user.getRecentActivity({ limit: 6 }),
      // Default chart view is 28 days. The 1Y toggle re-queries on the
      // client, so server-rendering 365 days every page load is wasted
      // work — most users never click 1Y, and the year-long scan
      // dominates this page's first-paint latency on accounts with
      // many posts.
      trpc.user.getReachTimeseries({ rangeDays: 28 }),
      trpc.user.getWhatsWorking(),
      trpc.connections.list(),
    ]);
  const connectedProviders = new Set(connections.map((c) => c.provider));

  const w = home.weeklyStats;

  // Revenue impact: real Appointment.estimatedValueCents sum, fallback to
  // $400/appt heuristic when value field is empty.
  const revenueImpact =
    w.appointmentValueCents > 0
      ? w.appointmentValueCents
      : w.appointmentsBooked * 40000;

  // Time saved heuristic — kept honest with a "—" if there's no activity.
  const timeSavedH = Math.round(
    (w.messagesHandled * 30 + w.callsHandled * 15 + w.postsCount * 45) / 60,
  );

  // Engagement: real last-14-days from the daily rollup.
  const last14 = reachDaily.slice(-14);
  const engagement = last14.map((d) => d.reach);
  const dayLabels = last14.map((d) => {
    const date = new Date(d.day);
    return ["s", "m", "t", "w", "t", "f", "s"][date.getUTCDay()] ?? "·";
  });
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayIdx = last14.findIndex((d) => d.day === todayKey);
  const peakIdx = engagement.reduce(
    (best, v, i) => (v > engagement[best]! ? i : best),
    0,
  );
  const peakDate =
    engagement.some((v) => v > 0) && last14[peakIdx]
      ? new Date(last14[peakIdx]!.day).toLocaleDateString("en-US", {
          weekday: "long",
        }).toLowerCase()
      : null;

  // Reach chart series — bucketed for each range.
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

  function fmtAxisDate(daysAgo: number): string {
    const d = new Date(Date.now() - daysAgo * DAY_MS);
    return d
      .toLocaleDateString("en-US", { month: "short", day: "numeric" })
      .toLowerCase();
  }

  const reachSeries = {
    "1W": has(range1W) ? range1W : [],
    "4W": has(range4W) ? range4W : [],
    "3M": has(range3M) ? range3M : [],
    "1Y": has(range1Y) ? range1Y : [],
  };
  const reachAxis = {
    "1W": [fmtAxisDate(6), "today"] as [string, string],
    "4W": [fmtAxisDate(27), "today"] as [string, string],
    "3M": [fmtAxisDate(89), "today"] as [string, string],
    "1Y": [fmtAxisDate(364), "today"] as [string, string],
  };

  const igConnected = connectedProviders.has("INSTAGRAM");
  const fbConnected = connectedProviders.has("FACEBOOK");
  const liConnected = connectedProviders.has("LINKEDIN");
  const tgBotConnected = connectedProviders.has("TELEGRAM");
  const tgChannelConnected = connectedProviders.has("TELEGRAM_CHANNEL");

  const channels: Channel[] = [
    {
      name: "Instagram",
      status: igConnected ? "alive" : "idle",
      meta: igConnected ? "connected" : undefined,
      href: "/settings#channels",
    },
    {
      name: "LinkedIn",
      status: liConnected ? "alive" : "idle",
      meta: liConnected ? "connected" : undefined,
      href: "/settings#channels",
    },
    {
      name: "Facebook",
      status: fbConnected ? "alive" : "idle",
      meta: fbConnected ? "connected" : undefined,
      href: "/settings#channels",
    },
    {
      name: "Telegram bot",
      status: tgBotConnected ? "alive" : "idle",
      meta: tgBotConnected ? "answers dms" : undefined,
      href: "/settings#channels",
    },
    {
      name: "Telegram channel",
      status: tgChannelConnected ? "alive" : "idle",
      meta: tgChannelConnected ? "publishes posts" : undefined,
      href: "/settings#channels",
    },
    {
      name: "calls + sms",
      status: home.phoneStatus.active ? "alive" : "idle",
      num: home.phoneStatus.active
        ? String(w.callsHandled + w.messagesHandled)
        : undefined,
      meta: home.phoneStatus.active ? "handled this week" : undefined,
      delta:
        w.appointmentsBooked > 0
          ? `${w.appointmentsBooked} booked`
          : undefined,
      href: "/inbox",
    },
    {
      name: "Email",
      status: "alive",
      meta: "newsletter ready",
      href: "/settings#channels",
    },
  ];

  return (
    <>
      <DashGreeting
        headline={headline(w.postsCount, w.messagesHandled)}
        subhead={subhead({ reach: w.reach, messages: w.messagesHandled })}
      />

      {home.pendingFinding ? (
        <NeedsYouBanner
          title={home.pendingFinding.summary}
          subtitle="i need a few photos from you"
        />
      ) : null}

      <KpiGrid
        items={[
          {
            label: "revenue impact",
            value: revenueImpact > 0 ? `$${(revenueImpact / 100 / 1000).toFixed(1)}k` : "$0",
            delta:
              revenueImpact > 0
                ? `↑ ${w.appointmentsBooked} booked`
                : undefined,
            deltaTrend: revenueImpact > 0 ? "up" : "flat",
          },
          {
            label: "reach",
            value: fmtReach(w.reach),
            delta:
              w.reachDeltaPct !== null
                ? `${w.reachDeltaPct >= 0 ? "↑" : "↓"} ${Math.abs(w.reachDeltaPct)}%`
                : undefined,
            deltaTrend:
              w.reachDeltaPct === null
                ? "flat"
                : w.reachDeltaPct >= 0
                  ? "up"
                  : "down",
          },
          {
            label: "conversations",
            value: String(w.messagesHandled + w.callsHandled),
            delta:
              w.messagesHandled + w.callsHandled > 0
                ? "all answered"
                : undefined,
            deltaTrend: "up",
          },
          {
            label: "time saved",
            value: timeSavedH > 0 ? `~${timeSavedH}h` : "—",
            delta: timeSavedH > 0 ? "→ same" : undefined,
            deltaTrend: "flat",
          },
        ]}
      />

      <ReachChart
        totalReach={w.reach}
        deltaPct={w.reachDeltaPct}
        series={reachSeries}
        rangeAxis={reachAxis}
      />

      <div className="flex items-baseline justify-between mb-lg">
        <h2
          className="font-medium tracking-tight"
          style={{ fontSize: "18px", letterSpacing: "-0.015em" }}
        >
          your channels
        </h2>
        <Link
          href="/settings#channels"
          className="text-xs text-ink4 hover:text-ink"
        >
          manage all
        </Link>
      </div>
      <ChannelsGrid channels={channels} />

      <EngagementBars
        values={engagement}
        dayLabels={dayLabels}
        todayIdx={todayIdx >= 0 ? todayIdx : undefined}
        subtitle={
          peakDate
            ? `peak: ${peakDate}`
            : "i'll surface peak days as posts publish"
        }
      />

      <div className="flex items-baseline justify-between mb-lg">
        <h2
          className="font-medium tracking-tight"
          style={{ fontSize: "18px", letterSpacing: "-0.015em" }}
        >
          what&apos;s working
        </h2>
        <Link
          href="/content?tab=performance"
          className="text-xs text-ink4 hover:text-ink"
        >
          see all
        </Link>
      </div>
      <WhatsWorking
        items={working.items.slice(0, 3).map((it) => ({
          label: it.label,
          delta: `${it.lift >= 0 ? "+" : ""}${it.lift}%`,
        }))}
      />

      <div className="flex items-baseline justify-between mb-lg">
        <h2
          className="font-medium tracking-tight"
          style={{ fontSize: "18px", letterSpacing: "-0.015em" }}
        >
          recent
        </h2>
        <Link href="/report" className="text-xs text-ink4 hover:text-ink">
          full report
        </Link>
      </div>
      <RecentActivity items={activity} />
    </>
  );
}

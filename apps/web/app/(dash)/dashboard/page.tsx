import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { RunningBanner } from "../../../components/dashboard/running-banner";
import { NeedsYouBanner } from "../../../components/dashboard/needs-you-banner";
import { MetricTiles } from "../../../components/dashboard/metric-tiles";
import { RecentActivity } from "../../../components/dashboard/recent-activity";
import { LiveTicker } from "../../../components/shared/live-ticker";

function headline(postsCount: number): string {
  if (postsCount === 0) return "still warming up.";
  if (postsCount === 1) return "i posted 1 thing this week.";
  return `i posted ${postsCount} things this week.`;
}

function subhead({
  reach,
  messagesHandled,
  postsCount,
}: {
  reach: number;
  messagesHandled: number;
  postsCount: number;
}): string {
  // Calm, useful tone in the empty state — no "no messages this week."
  if (postsCount === 0 && messagesHandled === 0) {
    return "i'm set up and watching. drafts, signals, and inbox activity will land here as it happens.";
  }
  const reachStr =
    reach >= 1000
      ? `${(reach / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : String(reach);
  const parts: string[] = [];
  if (reach > 0) parts.push(`${reachStr} people saw them.`);
  if (messagesHandled > 0) {
    parts.push(
      `${messagesHandled} customer${messagesHandled === 1 ? "" : "s"} messaged you — i handled them.`,
    );
  }
  return parts.join(" ");
}

function callsCaption({
  callsHandled,
  appointmentsBooked,
}: {
  callsHandled: number;
  appointmentsBooked: number;
}): string {
  if (callsHandled === 0) return "no calls yet.";
  const booked =
    appointmentsBooked > 0
      ? ` ${appointmentsBooked} booked appointment${appointmentsBooked === 1 ? "" : "s"}.`
      : "";
  return `i handled all of them.${booked}`;
}

function messagesCaption(count: number): string {
  if (count === 0) return "nothing to answer yet.";
  return "all answered.";
}

function reachCaption({
  reach,
  deltaPct,
}: {
  reach: number;
  deltaPct: number | null;
}): React.ReactNode {
  if (reach === 0) return "no posts yet.";
  if (deltaPct === null) return "first week of tracking.";
  const up = deltaPct >= 0;
  return (
    <>
      <span className={up ? "text-aliveDark" : "text-urgent"}>
        {up ? "+" : ""}
        {deltaPct}%
      </span>{" "}
      vs last week
    </>
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

  // Build a ticker from real recent activity — falls back to a friendly
  // empty state if nothing happened yet.
  const tickerEvents = activity.length
    ? activity.slice(0, 5).map((a) => `${a.agent.toLowerCase()} · ${a.title.toLowerCase()}`)
    : ["everything's set up. waiting for the first signal."];

  return (
    <>
      <RunningBanner
        headline={headline(home.weeklyStats.postsCount)}
        subhead={subhead(home.weeklyStats)}
      />

      <div className="mb-xl -mt-md">
        <LiveTicker events={tickerEvents} />
      </div>

      {home.pendingFinding ? (
        <NeedsYouBanner
          title={home.pendingFinding.summary}
          cta="tap to help →"
        />
      ) : null}

      <MetricTiles
        items={[
          {
            label: "CALLS THIS WEEK",
            value: String(home.weeklyStats.callsHandled),
            caption: callsCaption({
              callsHandled: home.weeklyStats.callsHandled,
              appointmentsBooked: home.weeklyStats.appointmentsBooked,
            }),
          },
          {
            label: "MESSAGES",
            value: String(home.weeklyStats.messagesHandled),
            caption: messagesCaption(home.weeklyStats.messagesHandled),
          },
          {
            label: "REACH",
            value:
              home.weeklyStats.reach >= 1000
                ? `${(home.weeklyStats.reach / 1000).toFixed(1).replace(/\.0$/, "")}k`
                : String(home.weeklyStats.reach),
            caption: reachCaption({
              reach: home.weeklyStats.reach,
              deltaPct: home.weeklyStats.reachDeltaPct,
            }),
          },
        ]}
      />

      <RecentActivity items={activity} />
    </>
  );
}

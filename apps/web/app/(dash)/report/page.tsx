import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { Card } from "../../../components/shared/card";
import { StatusDot } from "../../../components/shared/status-dot";
import { PageHero } from "../../../components/shared/page-hero";

function formatCurrency(cents: number): string {
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1).replace(/\.0$/, "")}k`;
  if (cents === 0) return "$0";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function formatReach(reach: number): string {
  if (reach >= 1000) return `${(reach / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(reach);
}

function storyFrom({
  postsPublished,
  reach,
  appointmentsBooked,
  callsHandled,
}: {
  postsPublished: number;
  reach: number;
  appointmentsBooked: number;
  callsHandled: number;
}): string {
  if (
    postsPublished === 0 &&
    callsHandled === 0 &&
    appointmentsBooked === 0
  ) {
    return "quiet week — i was setting up and learning. next week i'll have more to show.";
  }
  const parts: string[] = [];
  if (postsPublished > 0) {
    parts.push(
      `i published ${postsPublished} post${postsPublished === 1 ? "" : "s"}${
        reach > 0 ? ` and ${formatReach(reach)} people saw them` : ""
      }.`,
    );
  }
  if (callsHandled > 0) {
    parts.push(
      `${callsHandled} call${callsHandled === 1 ? "" : "s"} came through — i handled them.`,
    );
  }
  if (appointmentsBooked > 0) {
    parts.push(
      `${appointmentsBooked} of them turned into booked appointments.`,
    );
  }
  return parts.join(" ");
}

function timeSaved({
  postsPublished,
  messagesInbound,
  callsHandled,
  appointmentsBooked,
}: {
  postsPublished: number;
  messagesInbound: number;
  callsHandled: number;
  appointmentsBooked: number;
}): string {
  // Very rough estimate: 30m per post, 5m per message, 10m per call, 15m per booking
  const minutes =
    postsPublished * 30 +
    messagesInbound * 5 +
    callsHandled * 10 +
    appointmentsBooked * 15;
  if (minutes < 30) return "~0 hrs";
  const hours = minutes / 60;
  if (hours < 1) return `~${Math.round(minutes)} min`;
  return `~${hours < 10 ? hours.toFixed(1).replace(/\.0$/, "") : Math.round(hours)} hrs`;
}

export default async function ReportPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const report = await trpc.insights.getWeeklyReport({});

  const weekLabel = `WEEK OF ${report.weekStart
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase()} · SENT EVERY SUNDAY`;

  const didItems = [
    `${report.postsPublished} post${report.postsPublished === 1 ? "" : "s"} published`,
    `${report.callsHandled} call${report.callsHandled === 1 ? "" : "s"} answered`,
    `${report.messagesInbound} message${report.messagesInbound === 1 ? "" : "s"} handled`,
    `${report.appointmentsBooked} appointment${report.appointmentsBooked === 1 ? "" : "s"} booked`,
  ];

  return (
    <>
      <PageHero
        title="your week, at a glance."
        sub="what i shipped, what i caught, what's about to land."
        meta={weekLabel}
        showLive
      />


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg mb-xl">
        <Card>
          <div className="text-xs text-ink4 mb-sm">
            revenue impact
          </div>
          <div className="text-3xl font-medium tracking-tight">
            {formatCurrency(report.revenueImpactCents)}
          </div>
          <div className="text-sm text-ink3 mt-sm">
            est. from appointments i booked
          </div>
        </Card>
        <Card>
          <div className="text-xs text-ink4 mb-sm">reach</div>
          <div className="text-3xl font-medium tracking-tight">
            {formatReach(report.reach)}
          </div>
          <div className="text-sm text-ink3 mt-sm">
            {report.reachDeltaPct === null ? (
              "first week of tracking"
            ) : (
              <>
                <span
                  className={
                    report.reachDeltaPct >= 0
                      ? "text-aliveDark"
                      : "text-urgent"
                  }
                >
                  {report.reachDeltaPct >= 0 ? "+" : ""}
                  {report.reachDeltaPct}%
                </span>{" "}
                vs last week
              </>
            )}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-ink4 mb-sm">
            time you saved
          </div>
          <div className="text-3xl font-medium tracking-tight">
            {timeSaved(report)}
          </div>
          <div className="text-sm text-ink3 mt-sm">
            vs doing it all yourself
          </div>
        </Card>
      </div>

      <Card className="mb-xl">
        <div className="text-xs text-ink4 mb-md">
          this week&apos;s story
        </div>
        <p className="text-lg leading-relaxed">{storyFrom(report)}</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <Card>
          <div className="text-xs text-ink4 mb-lg">
            what i did
          </div>
          <div className="flex flex-col gap-sm">
            {didItems.map((item) => (
              <div key={item} className="flex items-center gap-sm">
                <StatusDot tone="alive" />
                <span className="text-md">{item}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-ink4 mb-lg">
            what i noticed
          </div>
          {report.findings.length === 0 ? (
            <p className="text-sm text-ink3">
              nothing notable yet — i&apos;ll surface patterns as they appear.
            </p>
          ) : (
            <div className="flex flex-col gap-sm">
              {report.findings.slice(0, 6).map((f) => (
                <div key={f.id} className="flex items-center gap-sm">
                  <StatusDot
                    tone={
                      f.severity === "NEEDS_ATTENTION" ? "attn" : "alive"
                    }
                  />
                  <span className="text-md">{f.summary}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

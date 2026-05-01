import Link from "next/link";
import { trpcServer } from "../../lib/trpc-server";
import { formatCents } from "@orb/api";

function Metric({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "alive" | "urgent" | "neutral";
}) {
  const accentClass =
    accent === "alive"
      ? "text-alive"
      : accent === "urgent"
        ? "text-urgent"
        : "text-ink";
  return (
    <div className="flex flex-col gap-xs bg-surface border-hairline border-border rounded-lg p-lg">
      <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
        {label}
      </p>
      <p className={`text-3xl font-medium font-mono ${accentClass}`}>{value}</p>
      {sublabel && (
        <p className="text-xs font-mono text-ink4">{sublabel}</p>
      )}
    </div>
  );
}

export default async function DashboardOverview() {
  const trpc = await trpcServer();
  const [overview, perService] = await Promise.all([
    trpc.admin.financialsOverview(),
    trpc.admin.financialsPerService(),
  ]);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-2xl">
      <div className="flex flex-col gap-sm">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          this month
        </p>
        <h1 className="text-2xl font-medium">financial overview</h1>
        <p className="text-xs font-mono text-ink4">
          {new Date(overview.period.start).toLocaleDateString()} →{" "}
          {new Date(overview.period.end).toLocaleDateString()}
        </p>
      </div>

      {/* Top-line metrics */}
      <div className="grid md:grid-cols-4 gap-md">
        <Metric
          label="MRR"
          value={formatCents(overview.revenue.mrrCents)}
          sublabel={`${overview.users.active} paying`}
          accent="alive"
        />
        <Metric
          label="variable cost"
          value={formatCents(overview.costs.variableCents)}
          sublabel="anthropic + replicate + twilio + brandkit + vapi + video"
        />
        <Metric
          label="gross margin"
          value={formatCents(overview.margin.grossCents)}
          sublabel={`${overview.margin.grossPct.toFixed(0)}%`}
          accent={overview.margin.grossCents >= 0 ? "alive" : "urgent"}
        />
        <Metric
          label="total users"
          value={overview.users.total.toString()}
          sublabel={`${overview.users.trialing} trialing`}
        />
      </div>

      {/* User subscription breakdown */}
      <section className="flex flex-col gap-md">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          subscriptions
        </p>
        <div className="grid md:grid-cols-4 gap-md">
          <Metric label="trialing" value={overview.users.trialing.toString()} />
          <Metric
            label="active"
            value={overview.users.active.toString()}
            accent="alive"
          />
          <Metric
            label="past due"
            value={overview.users.pastDue.toString()}
            accent={overview.users.pastDue > 0 ? "urgent" : "neutral"}
          />
          <Metric label="canceled" value={overview.users.canceled.toString()} />
        </div>
      </section>

      {/* Multi-business + brand kit */}
      <section className="flex flex-col gap-md">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          businesses & brand kit
        </p>
        <div className="grid md:grid-cols-3 gap-md">
          <Metric
            label="active businesses"
            value={overview.businesses.active.toString()}
            sublabel={`vs ${overview.users.total} users`}
          />
          <Metric
            label="brand kits"
            value={overview.brandKit.kitsTotal.toString()}
            sublabel="all-time"
          />
          <Metric
            label="brand kit regens"
            value={overview.brandKit.regenerationsThisMonth.toString()}
            sublabel="this month"
          />
        </div>
      </section>

      {/* Cost breakdown */}
      <section className="flex flex-col gap-md">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          cost by service
        </p>
        <div className="bg-surface border-hairline border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="hairline-bottom text-left">
                <th className="px-md py-sm font-mono text-xs text-ink3">
                  service
                </th>
                <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                  units
                </th>
                <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                  unit cost
                </th>
                <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                  total
                </th>
              </tr>
            </thead>
            <tbody>
              {perService.services.map((s) => (
                <tr key={s.name} className="hairline-bottom last:border-0">
                  <td className="px-md py-sm text-ink">{s.name}</td>
                  <td className="px-md py-sm font-mono text-ink3 text-right">
                    {s.count} {s.unit}
                  </td>
                  <td className="px-md py-sm font-mono text-ink4 text-right">
                    {formatCents(s.unitCostCents)}
                  </td>
                  <td className="px-md py-sm font-mono text-ink text-right">
                    {formatCents(s.costCents)}
                  </td>
                </tr>
              ))}
              <tr className="bg-bg">
                <td className="px-md py-sm text-ink font-medium">total</td>
                <td colSpan={2} />
                <td className="px-md py-sm font-mono text-ink font-medium text-right">
                  {formatCents(
                    overview.costs.totalCents,
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink4 font-mono">
          fixed overhead (vercel, supabase) included as monthly line items.
          anthropic costs are estimates from observed agent averages; swap to
          real token usage once logging lands.
        </p>
      </section>

      {/* Agent activity */}
      <section className="flex flex-col gap-md">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          agent activity this month
        </p>
        <div className="grid md:grid-cols-3 gap-md">
          <Metric
            label="strategist runs"
            value={overview.eventCounts.strategist.toString()}
          />
          <Metric
            label="echo drafts"
            value={overview.eventCounts.echoDrafts.toString()}
            sublabel={`${overview.eventCounts.echoRegens} regenerations`}
          />
          <Metric
            label="signal sms"
            value={overview.eventCounts.signalSms.toString()}
          />
          <Metric
            label="scout sweeps"
            value={overview.eventCounts.scoutSweeps.toString()}
          />
          <Metric
            label="pulse sweeps"
            value={overview.eventCounts.pulseSweeps.toString()}
          />
          <Metric
            label="images generated"
            value={overview.eventCounts.imagesGenerated.toString()}
            sublabel={`${formatCents(overview.costs.replicateCents)} on replicate`}
          />
          <Metric
            label="brand kit gens"
            value={overview.eventCounts.brandKitGenerations.toString()}
            sublabel={`${formatCents(overview.costs.brandKitCents)} this month`}
          />
          <Metric
            label="vapi voice"
            value={`${overview.eventCounts.vapiCalls} calls`}
            sublabel={`${overview.eventCounts.vapiMinutes} min · ${formatCents(overview.costs.vapiCents)}`}
          />
          <Metric
            label="videos generated"
            value={overview.eventCounts.videosGenerated.toString()}
            sublabel={`${formatCents(overview.costs.videoCents)} · ${overview.eventCounts.videoTotalSeconds}s rendered`}
          />
          <div className="flex flex-col gap-xs bg-surface border-hairline border-border rounded-lg p-lg">
            <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
              twilio
            </p>
            <p className="text-md font-mono text-ink">
              {overview.costs.twilioBreakdown.activeNumbers} numbers ·{" "}
              {overview.costs.twilioBreakdown.outboundSmsCount} sms
            </p>
          </div>
        </div>
      </section>

      <Link
        href="/dashboard/users"
        className="text-sm font-mono text-ink underline underline-offset-4 self-start"
      >
        see per-user breakdown →
      </Link>
    </div>
  );
}

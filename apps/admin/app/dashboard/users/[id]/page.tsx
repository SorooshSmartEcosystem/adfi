import Link from "next/link";
import { notFound } from "next/navigation";
import { trpcServer } from "../../../../lib/trpc-server";
import { formatCents } from "@orb/api";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trpc = await trpcServer();

  let detail;
  try {
    detail = await trpc.admin.financialsUserDetail({ userId: id });
  } catch {
    notFound();
  }

  const { user, subscription, revenueCents, costs, margin, activity, byEvent } =
    detail;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-2xl">
      <div className="flex flex-col gap-sm">
        <Link
          href="/dashboard/users"
          className="text-xs font-mono text-ink3 hover:text-ink transition-colors self-start"
        >
          ← all users
        </Link>
        <h1 className="text-2xl font-medium">
          {user.email ?? user.phone ?? user.id.slice(0, 12)}
        </h1>
        {user.businessDescription && (
          <p className="text-sm text-ink3 font-mono max-w-2xl">
            {user.businessDescription}
          </p>
        )}
      </div>

      {/* Account state */}
      <section className="grid md:grid-cols-3 gap-md">
        <div className="flex flex-col gap-xs bg-surface border-hairline border-border rounded-lg p-lg">
          <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
            status
          </p>
          <p className="text-md font-mono text-ink">
            {subscription
              ? `${subscription.plan.toLowerCase()} · ${subscription.status.toLowerCase()}`
              : "no subscription"}
          </p>
          {subscription?.currentPeriodEnd && (
            <p className="text-xs text-ink4 font-mono">
              through {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-xs bg-surface border-hairline border-border rounded-lg p-lg">
          <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
            onboarded
          </p>
          <p className="text-md font-mono text-ink">
            {user.onboardedAt
              ? new Date(user.onboardedAt).toLocaleDateString()
              : "not complete"}
          </p>
        </div>
        <div className="flex flex-col gap-xs bg-surface border-hairline border-border rounded-lg p-lg">
          <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
            trial ends
          </p>
          <p className="text-md font-mono text-ink">
            {user.trialEndsAt
              ? new Date(user.trialEndsAt).toLocaleDateString()
              : "—"}
          </p>
        </div>
      </section>

      {/* Financial summary */}
      <section className="grid md:grid-cols-3 gap-md">
        <div className="flex flex-col gap-xs bg-surface border-hairline border-border rounded-lg p-lg">
          <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
            revenue (mtd)
          </p>
          <p className="text-2xl font-mono text-alive">
            {formatCents(revenueCents)}
          </p>
        </div>
        <div className="flex flex-col gap-xs bg-surface border-hairline border-border rounded-lg p-lg">
          <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
            cost (mtd)
          </p>
          <p className="text-2xl font-mono text-ink">
            {formatCents(costs.totalCostCents)}
          </p>
        </div>
        <div className="flex flex-col gap-xs bg-surface border-hairline border-border rounded-lg p-lg">
          <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
            margin
          </p>
          <p
            className={`text-2xl font-mono ${
              margin.cents >= 0 ? "text-alive" : "text-urgent"
            }`}
          >
            {revenueCents > 0 ? formatCents(margin.cents) : "—"}
          </p>
        </div>
      </section>

      {/* Cost breakdown */}
      <section className="flex flex-col gap-md">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          cost breakdown
        </p>
        <div className="bg-surface border-hairline border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="hairline-bottom">
                <td className="px-md py-sm text-ink">Anthropic (all agents)</td>
                <td className="px-md py-sm font-mono text-ink3 text-right">
                  {activity.totalEvents - activity.imagesGenerated} events
                </td>
                <td className="px-md py-sm font-mono text-ink text-right">
                  {formatCents(costs.anthropicCents)}
                </td>
              </tr>
              <tr className="hairline-bottom">
                <td className="px-md py-sm text-ink">Replicate (Echo images)</td>
                <td className="px-md py-sm font-mono text-ink3 text-right">
                  {activity.imagesGenerated} images
                </td>
                <td className="px-md py-sm font-mono text-ink text-right">
                  {formatCents(costs.replicateCents)}
                </td>
              </tr>
              <tr className="hairline-bottom">
                <td className="px-md py-sm text-ink">Twilio — numbers</td>
                <td className="px-md py-sm font-mono text-ink3 text-right">
                  {activity.activeNumbers}
                </td>
                <td className="px-md py-sm font-mono text-ink text-right">
                  {formatCents(costs.twilioNumbersCents)}
                </td>
              </tr>
              <tr className="hairline-bottom">
                <td className="px-md py-sm text-ink">Twilio — outbound SMS</td>
                <td className="px-md py-sm font-mono text-ink3 text-right">
                  {activity.outboundSmsCount}
                </td>
                <td className="px-md py-sm font-mono text-ink text-right">
                  {formatCents(costs.twilioSmsCents)}
                </td>
              </tr>
              <tr className="bg-bg">
                <td className="px-md py-sm text-ink font-medium">total</td>
                <td />
                <td className="px-md py-sm font-mono text-ink font-medium text-right">
                  {formatCents(costs.totalCostCents)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Event detail */}
      {byEvent.length > 0 && (
        <section className="flex flex-col gap-md">
          <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
            anthropic events — {activity.totalEvents} total
          </p>
          <div className="bg-surface border-hairline border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="hairline-bottom text-left">
                  <th className="px-md py-sm font-mono text-xs text-ink3">
                    agent
                  </th>
                  <th className="px-md py-sm font-mono text-xs text-ink3">
                    event
                  </th>
                  <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                    count
                  </th>
                  <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                    cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {byEvent.map((e) => (
                  <tr
                    key={`${e.agent}:${e.eventType}`}
                    className="hairline-bottom last:border-0"
                  >
                    <td className="px-md py-sm text-ink font-mono">
                      {e.agent.toLowerCase()}
                    </td>
                    <td className="px-md py-sm text-ink3 font-mono">
                      {e.eventType}
                    </td>
                    <td className="px-md py-sm font-mono text-ink3 text-right">
                      {e.count}
                    </td>
                    <td className="px-md py-sm font-mono text-ink text-right">
                      {formatCents(e.costCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

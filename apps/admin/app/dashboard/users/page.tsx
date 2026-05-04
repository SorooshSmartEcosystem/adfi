import Link from "next/link";
import { trpcServer } from "../../../lib/trpc-server";
import { formatCents } from "@orb/api";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();

  const trpc = await trpcServer();
  const all = await trpc.admin.financialsPerUser({ limit: 100 });
  const rows = query
    ? all.filter((r) =>
        [r.email, r.phone, r.userId]
          .filter((v): v is string => Boolean(v))
          .some((v) => v.toLowerCase().includes(query)),
      )
    : all;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-2xl">
      <div className="flex flex-col gap-sm">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          per-user breakdown
        </p>
        <h1 className="text-2xl font-medium">users</h1>
        <p className="text-xs font-mono text-ink4">
          {rows.length}
          {query ? ` of ${all.length}` : ""} users with activity this month —
          sorted by paying status, then cost
        </p>
        <form method="get" className="flex items-center gap-sm mt-sm">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="search email, phone, or id"
            className="flex-1 max-w-[420px] px-md py-sm bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink"
          />
          <button
            type="submit"
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
          >
            search
          </button>
          {query ? (
            <Link
              href="/dashboard/users"
              className="font-mono text-xs text-ink4 hover:text-ink"
            >
              clear
            </Link>
          ) : null}
        </form>
      </div>

      <div className="bg-surface border-hairline border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="hairline-bottom text-left">
              <th className="px-md py-sm font-mono text-xs text-ink3">user</th>
              <th className="px-md py-sm font-mono text-xs text-ink3">plan</th>
              <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                events
              </th>
              <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                anthropic
              </th>
              <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                twilio
              </th>
              <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                cost
              </th>
              <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                revenue
              </th>
              <th className="px-md py-sm font-mono text-xs text-ink3 text-right">
                margin
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-md py-lg text-center text-ink3 font-mono text-sm italic"
                >
                  no user activity this month
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.userId} className="hairline-bottom last:border-0">
                  <td className="px-md py-sm">
                    <Link
                      href={`/dashboard/users/${r.userId}`}
                      className={`hover:underline ${
                        r.frozen ? "text-ink3 line-through" : "text-ink"
                      }`}
                    >
                      {r.email ?? r.phone ?? r.userId.slice(0, 8)}
                    </Link>
                    {r.frozen ? (
                      <span className="ml-xs font-mono text-[10px] text-urgent uppercase tracking-widest">
                        ❄ frozen
                      </span>
                    ) : null}
                  </td>
                  <td className="px-md py-sm font-mono text-xs text-ink3">
                    {r.plan ? (
                      <span>
                        {r.plan.toLowerCase()}{" "}
                        <span
                          className={
                            r.status === "ACTIVE"
                              ? "text-alive"
                              : r.status === "TRIALING"
                                ? "text-ink3"
                                : "text-ink4"
                          }
                        >
                          · {r.status?.toLowerCase()}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink4">no plan</span>
                    )}
                  </td>
                  <td className="px-md py-sm font-mono text-ink3 text-right">
                    {r.eventCount}
                  </td>
                  <td className="px-md py-sm font-mono text-ink3 text-right">
                    {formatCents(r.anthropicCents)}
                  </td>
                  <td className="px-md py-sm font-mono text-ink3 text-right">
                    {formatCents(r.twilioCents)}
                  </td>
                  <td className="px-md py-sm font-mono text-ink text-right">
                    {formatCents(r.totalCostCents)}
                  </td>
                  <td className="px-md py-sm font-mono text-alive text-right">
                    {r.revenueCents > 0 ? formatCents(r.revenueCents) : "—"}
                  </td>
                  <td
                    className={`px-md py-sm font-mono text-right ${
                      r.marginCents >= 0 ? "text-alive" : "text-urgent"
                    }`}
                  >
                    {r.revenueCents > 0 ? formatCents(r.marginCents) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink4 font-mono">
        margin column shows revenue − cost for paying users only. trial users
        show cost only (no revenue yet).
      </p>
    </div>
  );
}

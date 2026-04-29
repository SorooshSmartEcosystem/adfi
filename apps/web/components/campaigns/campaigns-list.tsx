"use client";
import Link from "next/link";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { StatusDot } from "../shared/status-dot";

const STATUS_TONE: Record<
  string,
  { label: string; dot: "alive" | "attn" | "neutral" | "urgent" }
> = {
  DRAFT:           { label: "draft",            dot: "neutral" },
  AWAITING_REVIEW: { label: "needs you",        dot: "attn" },
  ACTIVE:          { label: "running",          dot: "alive" },
  PAUSED:          { label: "paused",           dot: "neutral" },
  ENDED:           { label: "ended",            dot: "neutral" },
  REJECTED:        { label: "rejected",         dot: "neutral" },
  FAILED:          { label: "failed",           dot: "urgent" },
};

function fmtBudget(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function CampaignsList() {
  const list = trpc.campaigns.list.useQuery();

  if (list.isLoading) return <p className="text-sm text-ink3" dir="auto">one second</p>;
  if (!list.data) return null;

  if (list.data.campaigns.length === 0) {
    return (
      <Card>
        <div className="text-md font-medium mb-sm" dir="auto">no campaigns yet</div>
        <p className="text-sm text-ink3 leading-relaxed mb-md" dir="auto">
          tell me what to promote, the budget, and the platforms — i'll
          draft a complete campaign across meta, google, and youtube.
          you click approve once and i handle every platform.
        </p>
        <Link
          href="/campaigns/new"
          className="inline-block bg-ink text-white text-xs font-medium px-md py-[8px] rounded-full hover:opacity-85 transition-opacity"
        >
          + new campaign
        </Link>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      {list.data.campaigns.map((c, i) => {
        const tone = STATUS_TONE[c.status] ?? STATUS_TONE.DRAFT!;
        const sched = (c.schedule ?? {}) as { totalBudgetCents?: number };
        const totalBudget = sched.totalBudgetCents ?? 0;
        const spent = c.spendCents;
        const pct =
          totalBudget > 0
            ? Math.min(100, Math.round((spent / totalBudget) * 100))
            : 0;
        return (
          <div
            key={c.id}
            className={
              i < list.data.campaigns.length - 1 ? "hairline-b2 border-border2" : ""
            }
          >
            <Link
              href={`/campaigns/${c.id}`}
              className="block p-md hover:bg-surface transition-colors"
            >
              <div className="flex items-center gap-sm flex-wrap mb-xs">
                <StatusDot tone={tone.dot} animated={tone.dot === "attn"} />
                <span className="text-[11px] text-ink3">{tone.label}</span>
                <span className="text-[11px] text-ink4">·</span>
                <span className="text-[11px] text-ink4">
                  {c.platforms.join(", ").toLowerCase() || "no platform"}
                </span>
                <span className="text-[11px] text-ink4">·</span>
                <span className="text-[11px] text-ink4">
                  {c.goal.toLowerCase()}
                </span>
                <span className="text-[11px] text-ink4 ml-auto">
                  {fmtBudget(spent)} of {fmtBudget(totalBudget)}
                </span>
              </div>
              <div className="text-md font-medium leading-snug truncate" dir="auto">
                {c.name}
              </div>
              <div className="mt-sm h-[3px] bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-ink transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          </div>
        );
      })}
    </Card>
  );
}

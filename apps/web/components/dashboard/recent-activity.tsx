import Link from "next/link";
import { Card } from "../shared/card";

export type ActivityItem = {
  id: string;
  agent: string;
  at: Date;
  title: string;
  desc: string;
  value?: string;
};

function formatTimeLabel(at: Date): string {
  const now = Date.now();
  const diffMs = now - at.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) {
    const weekday = at.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const time = at.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).replace(" ", "");
    return `${weekday} ${time}`;
  }
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section className="mb-xl">
      <div className="flex items-center justify-between mb-lg">
        <h2 className="text-xl font-medium tracking-tight">recent activity</h2>
        <Link
          href="/report"
          className="font-mono text-xs text-ink2 px-md py-[5px] rounded-full border-hairline border-border hover:border-ink hover:text-ink transition-colors"
        >
          full report →
        </Link>
      </div>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-xl">
            <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
              FIRST FEW DAYS
            </div>
            <p className="text-md leading-relaxed mb-md">
              your agents are warming up. signal listens for calls + texts,
              echo drafts content on a weekly cadence, scout sweeps once a
              week, pulse runs daily. activity shows up here as it happens.
            </p>
            <div className="flex items-center gap-sm flex-wrap">
              <Link
                href="/specialist/echo"
                className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full"
              >
                run echo now →
              </Link>
              <Link
                href="/content"
                className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors"
              >
                plan this week
              </Link>
            </div>
          </div>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className={`px-lg py-md flex gap-md transition-colors hover:bg-surface2 ${i < items.length - 1 ? "border-b-hairline border-border2" : ""}`}
            >
              <div className="w-[32px] flex-shrink-0 flex flex-col items-center">
                <span className="w-[7px] h-[7px] rounded-full bg-alive mt-[6px]" />
                {i < items.length - 1 ? (
                  <span className="flex-1 w-[0.5px] bg-border2 mt-xs min-h-[12px]" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm flex-wrap mb-xs">
                  <span className="font-mono text-[10px] text-aliveDark tracking-widest">
                    {item.agent.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-ink4 tracking-wider">
                    {formatTimeLabel(item.at)}
                  </span>
                  {item.value ? (
                    <span className="ml-auto font-mono text-xs text-ink2">
                      {item.value}
                    </span>
                  ) : null}
                </div>
                <div className="text-sm font-medium mb-[3px]">{item.title}</div>
                {item.desc ? (
                  <div className="text-xs text-ink3 leading-snug">
                    {item.desc}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}

export type ActivityItem = {
  id: string;
  agent: string; // kept in data for filtering, not rendered on dashboard
  at: Date;
  title: string;
  desc: string;
  value?: string;
};

// Sentence-case, lowercase time tokens. "tue 2pm", "today", "mon 11am".
function formatTimeLabel(at: Date): string {
  const now = Date.now();
  const diffMs = now - at.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) {
    const weekday = at
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();
    const time = at
      .toLocaleTimeString("en-US", { hour: "numeric" })
      .replace(" ", "")
      .toLowerCase();
    return `${weekday} ${time}`;
  }
  return at
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toLowerCase();
}

// V3 simplified: flat rows — no bullet, no connecting line, no agent label.
// Title + time on one row, description below. Hover surface2.
export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-white border-hairline border-border rounded-[16px] px-[22px] py-lg mb-[48px]">
        <p className="text-sm text-ink3 leading-[1.6] mb-md">
          your agents are warming up. activity shows up here as it happens.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-hairline border-border rounded-[16px] overflow-hidden mb-[48px]">
      {items.map((item) => (
        <div
          key={item.id}
          className="px-[22px] py-[18px] border-b-hairline border-border2 last:border-b-0 transition-colors hover:bg-surface2"
        >
          <div className="flex items-center gap-md mb-[6px]">
            <div className="text-sm font-medium flex-1 min-w-0">
              {item.title}
            </div>
            <div className="text-xs text-ink4 shrink-0">
              {formatTimeLabel(item.at)}
            </div>
          </div>
          {item.desc ? (
            <div className="text-xs text-ink3 leading-[1.5]">{item.desc}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

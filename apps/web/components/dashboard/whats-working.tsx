export type WorkingItem = {
  label: string;
  pct: number; // bar fill 0-100
  delta: string; // "+85%" / "-12%"
  positive?: boolean;
};

export function WhatsWorking({
  items,
  windowLabel = "LAST 30 DAYS",
}: {
  items: WorkingItem[];
  windowLabel?: string;
}) {
  return (
    <div className="bg-white border-hairline border-border rounded-[16px] p-xl">
      <div className="flex items-center justify-between mb-lg">
        <div className="text-sm font-medium">what&apos;s working</div>
        <div className="font-mono text-[10px] text-ink4 tracking-widest">
          {windowLabel}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-ink3 leading-relaxed">
          not enough data yet — i&apos;ll learn what&apos;s landing as you publish.
        </p>
      ) : (
        <div className="flex flex-col gap-sm">
          {items.map((it, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-sm border-b-hairline border-border2 last:border-b-0"
            >
              <div className="text-xs flex-1">{it.label}</div>
              <div className="flex-none w-[60px] h-[4px] bg-surface rounded-sm overflow-hidden mx-md">
                <div
                  className={it.positive ?? it.pct > 50 ? "bg-ink h-full rounded-sm" : "bg-border h-full rounded-sm"}
                  style={{ width: `${Math.max(0, Math.min(100, it.pct))}%` }}
                />
              </div>
              <div
                className={`font-mono text-xs w-[44px] text-right ${
                  it.delta.startsWith("-") ? "text-ink4" : "text-aliveDark"
                }`}
              >
                {it.delta}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

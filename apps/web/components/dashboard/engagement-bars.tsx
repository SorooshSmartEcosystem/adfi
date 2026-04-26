// 14-day engagement bar chart. Each day is a 0-1 ratio relative to peak —
// last 7 days are filled (current week), prior 7 are muted (last week).
export function EngagementBars({
  values,
  dayLabels,
  peakLabel,
  deltaPct,
}: {
  values: number[];
  dayLabels: string[];
  peakLabel?: string;
  deltaPct?: number;
}) {
  const max = Math.max(...values, 1);
  const half = Math.floor(values.length / 2);

  return (
    <div className="bg-white border-hairline border-border rounded-[16px] p-xl">
      <div className="flex items-center justify-between mb-lg">
        <div className="text-sm font-medium">engagement by day</div>
        <div className="font-mono text-[10px] text-ink4 tracking-widest">
          LAST {values.length} DAYS
        </div>
      </div>
      <div className="flex items-end gap-[6px] h-[80px] mb-md">
        {values.map((v, i) => {
          const pct = (v / max) * 100;
          const isCurrent = i >= half;
          const isPeak = v === max;
          const cls = isPeak && isCurrent
            ? "bg-attentionBorder"
            : isCurrent
              ? "bg-ink"
              : "bg-border";
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-stretch justify-end gap-[2px]"
            >
              <div
                className={`${cls} rounded-sm origin-bottom`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
              <div className="font-mono text-[9px] text-ink5 text-center tracking-wider mt-[4px]">
                {dayLabels[i] ?? ""}
              </div>
            </div>
          );
        })}
      </div>
      {peakLabel || deltaPct !== undefined ? (
        <div className="flex items-center justify-between pt-md border-t-hairline border-border2">
          {peakLabel ? (
            <div className="text-xs text-ink3">{peakLabel}</div>
          ) : (
            <span />
          )}
          {deltaPct !== undefined ? (
            <span
              className={`font-mono text-[10px] ${deltaPct >= 0 ? "text-aliveDark" : "text-urgent"}`}
            >
              {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}%
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

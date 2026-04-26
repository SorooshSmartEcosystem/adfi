// V3 simplified: title + subtitle inline at the top, no mono pill, no
// bottom delta chip. min-height: 4px on bars so zero-days still render. The
// today index is highlighted in the day labels below.
export function EngagementBars({
  values,
  dayLabels,
  todayIdx,
  subtitle,
}: {
  values: number[];
  dayLabels: string[];
  todayIdx?: number;
  subtitle?: string;
}) {
  const max = Math.max(...values, 1);
  const half = Math.floor(values.length / 2);

  return (
    <div className="bg-white border-hairline border-border rounded-[16px] p-[28px] mb-[48px]">
      <div className="mb-[28px]">
        <div className="text-sm font-medium mb-[4px]">engagement by day</div>
        {subtitle ? (
          <div className="text-xs text-ink3">{subtitle}</div>
        ) : null}
      </div>
      <div className="flex items-end gap-[8px] h-[100px]">
        {values.map((v, i) => {
          const pct = (v / max) * 100;
          const isCurrent = i >= half;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-stretch justify-end gap-[6px]"
            >
              <div
                className={`${isCurrent ? "bg-ink" : "bg-border"} rounded-[3px]`}
                style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }}
              />
              <div
                className={`text-[10px] text-center ${
                  i === todayIdx ? "text-ink font-medium" : "text-ink5"
                }`}
              >
                {dayLabels[i] ?? ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

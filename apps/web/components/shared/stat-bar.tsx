type Segment = { label: string; value: number; color?: string };

const PALETTE = ["#111", "#666", "#999", "#D5D2C5"];

// Stacked horizontal bar with mono legend.
export function StatBar({
  segments,
  caption,
  rightCaption,
  className = "",
}: {
  segments: Segment[];
  caption?: string;
  rightCaption?: string;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div
      className={`bg-surface rounded-md px-md py-[12px] ${className}`}
    >
      {(caption || rightCaption) && (
        <div className="flex items-center justify-between mb-[10px]">
          {caption ? (
            <span className="font-mono text-[10px] text-ink3 tracking-[0.2em]">
              {caption}
            </span>
          ) : (
            <span />
          )}
          {rightCaption ? (
            <span className="font-mono text-[10px] text-aliveDark">
              {rightCaption}
            </span>
          ) : null}
        </div>
      )}
      <div className="flex h-[6px] rounded-sm overflow-hidden gap-[2px] mb-[10px]">
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              flex: seg.value / total,
              backgroundColor: seg.color ?? PALETTE[i % PALETTE.length],
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-sm">
        {segments.map((seg) => (
          <span
            key={seg.label}
            className="font-mono text-xs text-ink3"
          >
            {seg.label.toLowerCase()} · {seg.value}
          </span>
        ))}
      </div>
    </div>
  );
}

// Single-row horizontal bar — used for the performance breakdowns to
// visualise format/pillar averages against a baseline.
export function HorizontalBar({
  label,
  value,
  baseline,
  caption,
  max,
}: {
  label: string;
  value: number;
  baseline: number;
  caption?: string;
  max?: number;
}) {
  const ceiling = max ?? (Math.max(value, baseline) * 1.4 || 1);
  const valuePct = Math.min(100, (value / ceiling) * 100);
  const baselinePct = Math.min(100, (baseline / ceiling) * 100);
  const ratio = baseline > 0 ? value / baseline : null;
  const tone =
    ratio === null
      ? "text-ink4"
      : ratio >= 1.05
        ? "text-aliveDark"
        : ratio <= 0.95
          ? "text-urgent"
          : "text-ink4";

  return (
    <div className="mb-md last:mb-0">
      <div className="flex items-center justify-between mb-xs">
        <span className="text-sm">{label}</span>
        <span className="font-mono text-xs">
          {value.toLocaleString()}
          {caption ? (
            <span className={`ml-sm ${tone}`}>{caption}</span>
          ) : null}
        </span>
      </div>
      <div className="relative h-[6px] bg-border2 rounded-sm overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-ink rounded-sm transition-[width]"
          style={{ width: `${valuePct}%` }}
        />
        {baseline > 0 ? (
          <div
            className="absolute top-[-2px] h-[10px] w-[1px] bg-ink/40"
            style={{ left: `${baselinePct}%` }}
            title="baseline"
          />
        ) : null}
      </div>
    </div>
  );
}

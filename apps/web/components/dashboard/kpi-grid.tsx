type Trend = "up" | "down" | "flat";

export type Kpi = {
  label: string;
  value: string;
  delta?: string;
  deltaTrend?: Trend;
};

// Four cells inside a single rounded container. The 1px gap on a
// border-colored background paints the dividers between cells without each
// cell carrying its own border. Locks all four to a uniform baseline.
export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border-hairline border-border rounded-[16px] overflow-hidden mb-[48px]"
    >
      {items.map((it) => (
        <KpiCell key={it.label} kpi={it} />
      ))}
    </div>
  );
}

function KpiCell({ kpi }: { kpi: Kpi }) {
  const trend =
    kpi.deltaTrend === "up"
      ? "text-aliveDark"
      : "text-ink4";
  return (
    <div className="bg-white px-[22px] pt-[22px] pb-[24px]">
      <div className="text-xs text-ink4 mb-[12px]">{kpi.label}</div>
      <div
        className="font-medium leading-none mb-[8px]"
        style={{ fontSize: "32px", letterSpacing: "-0.025em" }}
      >
        {kpi.value}
      </div>
      {kpi.delta ? (
        <div className={`text-xs ${trend}`}>{kpi.delta}</div>
      ) : (
        <div className="text-xs text-ink4">—</div>
      )}
    </div>
  );
}

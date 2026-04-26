import { Sparkline } from "./sparkline";

type Trend = "up" | "down" | "flat";

export function KpiCard({
  label,
  value,
  delta,
  deltaTrend,
  context,
  spark,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTrend?: Trend;
  context?: string;
  spark?: number[];
}) {
  const trendCls =
    deltaTrend === "up"
      ? "text-aliveDark"
      : deltaTrend === "down"
        ? "text-urgent"
        : "text-ink4";
  return (
    <div className="bg-white border-hairline border-border rounded-[16px] p-lg pb-md transition-colors hover:border-ink5">
      <div className="font-mono text-[10px] text-ink4 tracking-[0.2em] mb-md flex items-center gap-[6px]">
        <span className="w-[5px] h-[5px] rounded-full bg-ink opacity-50" />
        {label}
      </div>
      <div
        className="font-medium leading-none mb-sm"
        style={{ fontSize: "30px", letterSpacing: "-0.025em" }}
      >
        {value}
      </div>
      <div className="flex items-center justify-between gap-md">
        {delta ? (
          <span className={`font-mono text-xs ${trendCls}`}>{delta}</span>
        ) : (
          <span />
        )}
        {spark && spark.length > 1 ? (
          <Sparkline
            values={spark}
            className={`flex-1 max-w-[80px] h-[28px] ${trendCls}`}
          />
        ) : null}
      </div>
      {context ? (
        <p className="text-xs text-ink3 leading-snug mt-md pt-md border-t border-dashed border-border2">
          {context}
        </p>
      ) : null}
    </div>
  );
}

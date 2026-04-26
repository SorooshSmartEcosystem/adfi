"use client";

import { useState } from "react";

type Range = "1W" | "4W" | "3M" | "1Y";

// V3 simplified: number is the title (no "REACH OVER TIME" label), subtitle
// reads "reach this week · ↑ 23%". No grid lines, no interior dots, no
// internal axis labels — just the line, area fill, alive end-dot, and two
// endpoint axis labels below.
export function ReachChart({
  totalReach,
  deltaPct,
  series,
  rangeAxis,
  defaultRange = "4W",
}: {
  totalReach: number;
  deltaPct: number | null;
  series: Record<Range, number[]>;
  rangeAxis: Record<Range, [string, string]>;
  defaultRange?: Range;
}) {
  const [range, setRange] = useState<Range>(defaultRange);
  const data = series[range] ?? [];
  const [axisLeft, axisRight] = rangeAxis[range] ?? ["", ""];

  const fmtReach = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

  const subRange =
    range === "1W"
      ? "this week"
      : range === "4W"
        ? "last 4 weeks"
        : range === "3M"
          ? "last 3 months"
          : "last 12 months";

  return (
    <div className="bg-white border-hairline border-border rounded-[16px] p-[28px] mb-[48px]">
      <div className="flex items-start justify-between flex-wrap gap-md mb-[28px]">
        <div>
          <div
            className="font-medium leading-none mb-[6px]"
            style={{ fontSize: "36px", letterSpacing: "-0.025em" }}
          >
            {fmtReach(totalReach)}
          </div>
          <div className="text-xs text-ink3">
            reach {subRange}
            {deltaPct !== null ? (
              <>
                {" · "}
                <span className={deltaPct >= 0 ? "text-aliveDark" : "text-ink4"}>
                  {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}%
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex gap-[4px]">
          {(["1W", "4W", "3M", "1Y"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-md py-[6px] rounded-full text-xs transition-colors ${
                r === range
                  ? "bg-surface text-ink"
                  : "text-ink4 hover:text-ink2"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {data.length >= 2 ? (
        <ReachSvg values={data} />
      ) : (
        <div className="h-[160px] flex items-center justify-center text-xs text-ink4">
          no data yet for {range.toLowerCase()}
        </div>
      )}

      <div className="flex justify-between text-[11px] text-ink4 mt-md">
        <span>{axisLeft}</span>
        <span>{axisRight}</span>
      </div>
    </div>
  );
}

function ReachSvg({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = 800 / (values.length - 1);
  const points = values.map((v, i) => ({
    x: i * step,
    y: 124 - ((v - min) / range) * 100,
  }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L800,160 L0,160 Z`;
  const last = points[points.length - 1]!;

  return (
    <svg
      className="w-full block"
      viewBox="0 0 800 160"
      preserveAspectRatio="none"
      style={{ height: "160px" }}
    >
      <path d={areaPath} className="fill-ink" opacity="0.04" />
      <path
        d={linePath}
        className="stroke-ink"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="5"
        className="fill-alive stroke-white"
        strokeWidth="2"
      />
    </svg>
  );
}

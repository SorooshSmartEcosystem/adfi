"use client";

import { useState } from "react";

type Range = "1W" | "4W" | "3M" | "1Y";

// Renders a smooth reach trend line with a subtle area fill. The data series
// is plain numbers; ranges that don't have data yet pass an empty array and
// we render an empty state instead of an unscaled flat line.
export function ReachChart({
  totalReach,
  deltaPct,
  series,
  rangeLabels,
  defaultRange = "4W",
}: {
  totalReach: number;
  deltaPct: number | null;
  series: Record<Range, number[]>;
  rangeLabels: Record<Range, string[]>;
  defaultRange?: Range;
}) {
  const [range, setRange] = useState<Range>(defaultRange);
  const data = series[range] ?? [];
  const labels = rangeLabels[range] ?? [];

  const fmtReach = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

  return (
    <div className="bg-white border-hairline border-border rounded-[18px] p-xl mb-2xl">
      <div className="flex items-start justify-between flex-wrap gap-md mb-xl">
        <div>
          <div className="font-mono text-[10px] text-ink4 tracking-[0.2em] mb-md flex items-center gap-[6px]">
            <span className="w-[5px] h-[5px] rounded-full bg-ink opacity-50" />
            REACH OVER TIME
          </div>
          <div
            className="font-medium leading-none mb-xs"
            style={{ fontSize: "36px", letterSpacing: "-0.025em" }}
          >
            {fmtReach(totalReach)}
          </div>
          <div className="text-xs text-ink3">
            people saw your work this week
            {deltaPct !== null ? (
              <>
                {" · "}
                <span
                  className={deltaPct >= 0 ? "text-aliveDark" : "text-urgent"}
                >
                  {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}%
                </span>{" "}
                vs last week
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center bg-surface rounded-full p-[3px] gap-[2px]">
          {(["1W", "4W", "3M", "1Y"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-md py-[5px] rounded-full font-mono text-[10px] tracking-wider transition-colors ${
                r === range
                  ? "bg-white text-ink shadow-[0_0_0_0.5px_rgb(229,227,219)]"
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
        <div className="h-[180px] flex items-center justify-center font-mono text-xs text-ink4 tracking-widest">
          NO DATA YET FOR {range}
        </div>
      )}

      <div className="flex justify-between pt-md border-t-hairline border-border2 mt-sm">
        {labels.map((l) => (
          <span
            key={l}
            className="font-mono text-[9px] text-ink5 tracking-widest"
          >
            {l}
          </span>
        ))}
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
    y: 140 - ((v - min) / range) * 110,
  }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L800,180 L0,180 Z`;
  const last = points[points.length - 1]!;

  return (
    <svg
      className="w-full block"
      viewBox="0 0 800 180"
      preserveAspectRatio="none"
      style={{ height: "180px" }}
    >
      <line
        x1="0"
        y1="36"
        x2="800"
        y2="36"
        className="stroke-border2"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />
      <line
        x1="0"
        y1="80"
        x2="800"
        y2="80"
        className="stroke-border2"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />
      <line
        x1="0"
        y1="124"
        x2="800"
        y2="124"
        className="stroke-border2"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />
      <path d={areaPath} className="fill-ink" opacity="0.04" />
      <path
        d={linePath}
        className="stroke-ink"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.slice(1, -1).filter((_, i) => i % 2 === 0).map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3"
          className="fill-ink stroke-white"
          strokeWidth="2"
        />
      ))}
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

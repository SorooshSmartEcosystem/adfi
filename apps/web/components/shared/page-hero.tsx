import type { ReactNode } from "react";

// V3: drop the white "live pill" and use a soft inline status row to match
// the dashboard greeting. Page-level meta sits next to the status when
// both are present.
export function PageHero({
  title,
  sub,
  showLive = false,
  meta,
  right,
}: {
  title: string;
  sub?: string;
  showLive?: boolean;
  meta?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-[40px]">
      {(showLive || meta) ? (
        <div className="flex items-center gap-md mb-md flex-wrap text-xs">
          {showLive ? (
            <span className="inline-flex items-center gap-sm text-aliveDark">
              <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse" />
              everything is running
            </span>
          ) : null}
          {meta ? <span className="text-ink4">{meta}</span> : null}
        </div>
      ) : null}
      <div className="flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1
            className="font-medium tracking-tight leading-[1.1]"
            style={{ fontSize: "clamp(22px, 3vw, 30px)" }}
          >
            {title}
          </h1>
          {sub ? (
            <p className="text-md text-ink3 mt-xs">{sub}</p>
          ) : null}
        </div>
        {right}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { LivePill } from "../dashboard/live-pill";

// Used at the top of secondary pages (/content, /inbox, /report) so they
// share visual rhythm with the dashboard's greeting block. Smaller than
// the dashboard hero — single line of meta, one-line subtitle.
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
    <div className="mb-xl">
      {(showLive || meta) ? (
        <div className="flex items-center gap-md mb-md flex-wrap">
          {showLive ? <LivePill /> : null}
          {meta ? (
            <span className="font-mono text-xs text-ink4 tracking-wider">
              {meta}
            </span>
          ) : null}
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

"use client";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_POST: "single post",
  CAROUSEL: "carousel",
  REEL_SCRIPT: "reel",
  EMAIL_NEWSLETTER: "email",
  STORY_SEQUENCE: "stories",
};

function ratio(avg: number, baseline: number): { label: string; tone: string } {
  if (baseline === 0) return { label: "—", tone: "text-ink4" };
  const r = avg / baseline;
  const pct = Math.round((r - 1) * 100);
  if (Math.abs(pct) < 5) return { label: `≈ avg`, tone: "text-ink4" };
  return {
    label: `${pct >= 0 ? "+" : ""}${pct}%`,
    tone: pct >= 0 ? "text-aliveDark" : "text-urgent",
  };
}

function fmtReach(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function PerformancePanel() {
  const query = trpc.content.getPerformanceSummary.useQuery();

  if (query.isLoading) {
    return (
      <p className="font-mono text-sm text-ink3">one second</p>
    );
  }
  const summary = query.data;
  if (!summary || summary.totalPosts === 0) {
    return (
      <Card>
        <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
          NOT ENOUGH DATA YET
        </div>
        <p className="text-md text-ink3 leading-relaxed">
          once you&apos;ve published a few posts and metrics roll in,
          this is where i&apos;ll show what&apos;s working and what
          isn&apos;t.
        </p>
      </Card>
    );
  }

  const baseline = summary.overall.avgReach;
  const formatRows = Object.entries(summary.byFormat).sort(
    (a, b) => b[1].avgReach - a[1].avgReach,
  );
  const pillarRows = Object.entries(summary.byPillar).sort(
    (a, b) => b[1].avgReach - a[1].avgReach,
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
            POSTS · LAST {summary.windowDays}D
          </div>
          <div className="text-3xl font-medium tracking-tight">
            {summary.totalPosts}
          </div>
          <div className="text-sm text-ink3 mt-sm">
            {fmtReach(summary.overall.totalReach)} total reach
          </div>
        </Card>
        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
            AVG REACH PER POST
          </div>
          <div className="text-3xl font-medium tracking-tight">
            {fmtReach(baseline)}
          </div>
          <div className="text-sm text-ink3 mt-sm">across all formats</div>
        </Card>
        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
            BEST FORMAT
          </div>
          {formatRows[0] ? (
            <>
              <div className="text-3xl font-medium tracking-tight">
                {FORMAT_LABEL[formatRows[0][0]] ?? formatRows[0][0]}
              </div>
              <div className="text-sm text-ink3 mt-sm">
                avg {fmtReach(formatRows[0][1].avgReach)} ·{" "}
                <span className={ratio(formatRows[0][1].avgReach, baseline).tone}>
                  {ratio(formatRows[0][1].avgReach, baseline).label}
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm text-ink3">—</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl">
        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-md">
            BY FORMAT
          </div>
          {formatRows.length === 0 ? (
            <p className="text-sm text-ink3">no breakdown yet.</p>
          ) : (
            <div className="flex flex-col gap-sm">
              {formatRows.map(([fmt, b]) => {
                const r = ratio(b.avgReach, baseline);
                return (
                  <div
                    key={fmt}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">
                      {FORMAT_LABEL[fmt] ?? fmt}
                      <span className="text-ink4 font-mono text-xs ml-xs">
                        · {b.count} post{b.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="font-mono text-sm">
                      {fmtReach(b.avgReach)}{" "}
                      <span className={r.tone}>{r.label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-md">
            BY PILLAR
          </div>
          {pillarRows.length === 0 ? (
            <p className="text-sm text-ink3">
              no pillar data yet — older posts may not have been tagged.
            </p>
          ) : (
            <div className="flex flex-col gap-sm">
              {pillarRows.map(([pil, b]) => {
                const r = ratio(b.avgReach, baseline);
                return (
                  <div
                    key={pil}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">
                      {pil}
                      <span className="text-ink4 font-mono text-xs ml-xs">
                        · {b.count} post{b.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="font-mono text-sm">
                      {fmtReach(b.avgReach)}{" "}
                      <span className={r.tone}>{r.label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {summary.topPosts.length > 0 ? (
        <Card padded={false} className="mb-xl">
          <div className="px-lg py-md hairline-b2 border-border2">
            <div className="font-mono text-sm text-ink4 tracking-[0.2em]">
              TOP PERFORMERS
            </div>
          </div>
          {summary.topPosts.map((p, i) => (
            <div
              key={i}
              className={`px-lg py-md ${i < summary.topPosts.length - 1 ? "hairline-b2 border-border2" : ""}`}
            >
              <div className="flex items-center justify-between mb-xs">
                <span className="font-mono text-xs text-aliveDark tracking-[0.2em]">
                  {FORMAT_LABEL[p.format] ?? p.format.toLowerCase()}
                  {p.pillar ? ` · ${p.pillar}` : ""}
                </span>
                <span className="font-mono text-sm">
                  {fmtReach(p.reach)} reach
                </span>
              </div>
              <div className="text-md leading-relaxed">
                {p.caption.slice(0, 220)}
                {p.caption.length > 220 ? "…" : ""}
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {summary.underperformers.length > 0 ? (
        <Card padded={false}>
          <div className="px-lg py-md hairline-b2 border-border2">
            <div className="font-mono text-sm text-ink4 tracking-[0.2em]">
              WEAKEST RECENT POSTS
            </div>
          </div>
          {summary.underperformers.map((p, i) => (
            <div
              key={i}
              className={`px-lg py-md ${i < summary.underperformers.length - 1 ? "hairline-b2 border-border2" : ""}`}
            >
              <div className="flex items-center justify-between mb-xs">
                <span className="font-mono text-xs text-attentionText tracking-[0.2em]">
                  {FORMAT_LABEL[p.format] ?? p.format.toLowerCase()}
                  {p.pillar ? ` · ${p.pillar}` : ""}
                </span>
                <span className="font-mono text-sm">
                  {fmtReach(p.reach)} reach
                </span>
              </div>
              <div className="text-md leading-relaxed text-ink2">
                {p.caption.slice(0, 220)}
                {p.caption.length > 220 ? "…" : ""}
              </div>
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
}

"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { HorizontalBar, StatBar } from "../shared/stat-bar";
import { PlatformFilter, type PlatformValue } from "./platform-filter";

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
  const [filter, setFilter] = useState<PlatformValue>("ALL");
  const query = trpc.content.getPerformanceSummary.useQuery({
    windowDays: 90,
    ...(filter !== "ALL" && {
      platform: filter as Exclude<PlatformValue, "ALL">,
    }),
  });

  const summary = query.data;
  const filterChrome = (
    <PlatformFilter
      value={filter}
      onChange={setFilter}
      label="filter performance"
    />
  );

  if (query.isLoading) {
    return (
      <>
        {filterChrome}
        <p className="font-mono text-sm text-ink3" dir="auto">one second</p>
      </>
    );
  }
  if (!summary || summary.totalPosts === 0) {
    return (
      <>
      {filterChrome}
      <Card>
        <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm" dir="auto">
          NO PUBLISHED POSTS YET
        </div>
        <p className="text-md text-ink2 leading-relaxed mb-md" dir="auto">
          performance lives here once you publish. you&apos;ll see best/worst
          format, best pillar, top posts ranked by reach, and what&apos;s up or
          down vs your baseline.
        </p>
        <p className="text-sm text-ink3 leading-relaxed mb-md" dir="auto">
          to start: approve a draft on the drafts tab, then either send a
          newsletter or post to instagram once we&apos;ve wired publishing.
        </p>
        <a
          href="/content?tab=drafts"
          className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full inline-block"
        >
          go to drafts →
        </a>
      </Card>
      </>
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
      {filterChrome}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm" dir="auto">
            POSTS · LAST {summary.windowDays}D
          </div>
          <div className="text-3xl font-medium tracking-tight" dir="auto">
            {summary.totalPosts}
          </div>
          <div className="text-sm text-ink3 mt-sm" dir="auto">
            {fmtReach(summary.overall.totalReach)} total reach
          </div>
        </Card>
        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm" dir="auto">
            AVG REACH PER POST
          </div>
          <div className="text-3xl font-medium tracking-tight" dir="auto">
            {fmtReach(baseline)}
          </div>
          <div className="text-sm text-ink3 mt-sm" dir="auto">across all formats</div>
        </Card>
        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm" dir="auto">
            BEST FORMAT
          </div>
          {formatRows[0] ? (
            <>
              <div className="text-3xl font-medium tracking-tight" dir="auto">
                {FORMAT_LABEL[formatRows[0][0]] ?? formatRows[0][0]}
              </div>
              <div className="text-sm text-ink3 mt-sm" dir="auto">
                avg {fmtReach(formatRows[0][1].avgReach)} ·{" "}
                <span className={ratio(formatRows[0][1].avgReach, baseline).tone}>
                  {ratio(formatRows[0][1].avgReach, baseline).label}
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm text-ink3" dir="auto">—</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl">
        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-md" dir="auto">
            BY FORMAT
          </div>
          {formatRows.length === 0 ? (
            <p className="text-sm text-ink3" dir="auto">no breakdown yet.</p>
          ) : (
            <div>
              {formatRows.map(([fmt, b]) => {
                const r = ratio(b.avgReach, baseline);
                return (
                  <HorizontalBar
                    key={fmt}
                    label={`${FORMAT_LABEL[fmt] ?? fmt} · ${b.count} post${b.count === 1 ? "" : "s"}`}
                    value={b.avgReach}
                    baseline={baseline}
                    caption={r.label}
                  />
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-md" dir="auto">
            BY PILLAR
          </div>
          {pillarRows.length === 0 ? (
            <p className="text-sm text-ink3" dir="auto">
              no pillar data yet — older posts may not have been tagged.
            </p>
          ) : (
            <div>
              {pillarRows.map(([pil, b]) => {
                const r = ratio(b.avgReach, baseline);
                return (
                  <HorizontalBar
                    key={pil}
                    label={`${pil} · ${b.count} post${b.count === 1 ? "" : "s"}`}
                    value={b.avgReach}
                    baseline={baseline}
                    caption={r.label}
                  />
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {Object.keys(summary.byFormat).length > 1 ? (
        <div className="mb-xl">
          <StatBar
            caption="FORMAT MIX"
            rightCaption="last 90 days"
            segments={Object.entries(summary.byFormat).map(([k, v]) => ({
              label: FORMAT_LABEL[k] ?? k.toLowerCase(),
              value: v.count,
            }))}
          />
        </div>
      ) : null}

      {summary.topPosts.length > 0 ? (
        <Card padded={false} className="mb-xl">
          <div className="px-lg py-md hairline-b2 border-border2">
            <div className="font-mono text-sm text-ink4 tracking-[0.2em]" dir="auto">
              TOP PERFORMERS
            </div>
          </div>
          {summary.topPosts.map((p, i) => (
            <div
              key={i}
              className={`px-lg py-md ${i < summary.topPosts.length - 1 ? "hairline-b2 border-border2" : ""}`}
            >
              <div className="flex items-center justify-between mb-xs">
                <span className="font-mono text-xs text-aliveDark tracking-[0.2em]" dir="auto">
                  {FORMAT_LABEL[p.format] ?? p.format.toLowerCase()}
                  {p.pillar ? ` · ${p.pillar}` : ""}
                </span>
                <span className="font-mono text-sm" dir="auto">
                  {fmtReach(p.reach)} reach
                </span>
              </div>
              <div className="text-md leading-relaxed" dir="auto">
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
            <div className="font-mono text-sm text-ink4 tracking-[0.2em]" dir="auto">
              WEAKEST RECENT POSTS
            </div>
          </div>
          {summary.underperformers.map((p, i) => (
            <div
              key={i}
              className={`px-lg py-md ${i < summary.underperformers.length - 1 ? "hairline-b2 border-border2" : ""}`}
            >
              <div className="flex items-center justify-between mb-xs">
                <span className="font-mono text-xs text-attentionText tracking-[0.2em]" dir="auto">
                  {FORMAT_LABEL[p.format] ?? p.format.toLowerCase()}
                  {p.pillar ? ` · ${p.pillar}` : ""}
                </span>
                <span className="font-mono text-sm" dir="auto">
                  {fmtReach(p.reach)} reach
                </span>
              </div>
              <div className="text-md leading-relaxed text-ink2" dir="auto">
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

import Link from "next/link";
import { Card } from "../shared/card";

type Slot = {
  day: string;
  dateNum: number;
  platform: string;
  status: "published" | "needs-you" | "drafted" | "quiet";
  title: string;
  metric: string;
  draftId?: string;
  postId?: string;
};

const STATUS_COLOR: Record<Slot["status"], string> = {
  published: "text-aliveDark",
  "needs-you": "text-attentionText",
  drafted: "text-ink3",
  quiet: "text-ink5",
};

const STATUS_BG: Record<Slot["status"], string> = {
  published: "bg-white",
  "needs-you": "bg-attentionBg",
  drafted: "bg-white",
  quiet: "bg-surface",
};

export function WeekGrid({
  rangeLabel,
  slots,
}: {
  rangeLabel: string;
  slots: Slot[];
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-lg">
        <div>
          <div className="text-xs text-ink4 mb-xs">
            {rangeLabel}
          </div>
          <div className="text-lg font-medium" dir="auto">this week&apos;s plan</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-sm">
        {slots.map((s, i) => {
          const href = s.draftId
            ? `/content?tab=drafts#d-${s.draftId}`
            : s.postId
              ? `/content?tab=performance#p-${s.postId}`
              : null;
          const Wrap = href ? Link : "div";
          const wrapProps = href
            ? { href, className: "block hover:-translate-y-[1px] transition-transform" }
            : {};
          return (
          <Wrap
            key={i}
            {...(wrapProps as { href: string; className: string })}
          >
          <div
            className={`rounded-md p-md min-h-[110px] border-hairline ${
              s.status === "needs-you" ? "border-attentionBorder" : "border-border"
            } ${STATUS_BG[s.status]}`}
          >
            <div className="flex items-start justify-between mb-sm">
              <div>
                <div className="text-xs text-ink4">{s.day.toLowerCase()}</div>
                <div className="text-md font-medium" dir="auto">{s.dateNum}</div>
              </div>
              {s.platform ? (
                <span className={`text-[11px] ${STATUS_COLOR[s.status]}`}>
                  {s.platform.toLowerCase()}
                </span>
              ) : null}
            </div>
            {s.title ? (
              <>
                <div className="text-sm font-medium leading-tight mb-xs" dir="auto">
                  {s.title}
                </div>
                <div className={`text-[11px] ${STATUS_COLOR[s.status]}`}>
                  {s.status === "needs-you" ? "● needs you" : s.metric}
                </div>
              </>
            ) : (
              <div className="text-sm text-ink5" dir="auto">quiet day</div>
            )}
          </div>
          </Wrap>
          );
        })}
      </div>
    </Card>
  );
}

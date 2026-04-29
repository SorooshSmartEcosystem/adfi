"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { ThinkingIndicator } from "../shared/thinking-indicator";

const PLATFORMS: { id: "META" | "GOOGLE" | "YOUTUBE" | "TIKTOK"; label: string; sub: string; soon?: boolean }[] = [
  { id: "META",    label: "meta",    sub: "instagram + facebook" },
  { id: "GOOGLE",  label: "google",  sub: "search + display" },
  { id: "YOUTUBE", label: "youtube", sub: "video ads" },
  { id: "TIKTOK",  label: "tiktok",  sub: "9:16 video", soon: true },
];

const DURATION_PRESETS = [7, 14, 30];

// Conversational brief intake — one textarea, one budget input, one
// duration toggle, and a platform picker. Per the user's "smart and
// easy UI/UX" requirement (2026-04-28), no big form — just the
// minimum the agent needs to draft.

export function CampaignBriefForm() {
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState("300");
  const [days, setDays] = useState(14);
  const [platforms, setPlatforms] = useState<Set<"META" | "GOOGLE" | "YOUTUBE" | "TIKTOK">>(
    () => new Set(["META"]),
  );
  const router = useRouter();

  const create = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      router.push(`/campaigns/${data.campaignId}`);
    },
  });

  const togglePlatform = (id: "META" | "GOOGLE" | "YOUTUBE" | "TIKTOK") => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalBudgetCents = Math.max(500, Math.round(Number(budget) * 100) || 0);
  const dailyBudget = totalBudgetCents / 100 / days;
  const lowDailyWarning = dailyBudget < 7
    ? `at $${dailyBudget.toFixed(2)}/day, platforms barely deliver — consider $7+/day`
    : null;

  const submit = () => {
    if (brief.trim().length < 10 || platforms.size === 0) return;
    create.mutate({
      brief: brief.trim(),
      platforms: Array.from(platforms),
      totalBudgetCents,
      durationDays: days,
    });
  };

  return (
    <Card>
      <div className="text-xs text-ink4 mb-sm">what should i promote?</div>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="e.g. promote my new wholesale tier to interior designers in canada — i want them to fill out the contact form."
        rows={3}
        className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-md focus:outline-none focus:border-ink mb-lg resize-none"
        disabled={create.isPending}
      />

      <div className="text-xs text-ink4 mb-sm">where should i run this?</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm mb-lg">
        {PLATFORMS.map((p) => {
          const checked = platforms.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => !p.soon && togglePlatform(p.id)}
              disabled={p.soon || create.isPending}
              className={`text-left px-md py-sm rounded-md border-hairline transition-colors ${
                p.soon
                  ? "border-border bg-surface opacity-60 cursor-not-allowed"
                  : checked
                    ? "border-ink bg-ink/5"
                    : "border-border hover:border-ink"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" dir="auto">{p.label}</span>
                <span className={`text-[10px] font-mono ${p.soon ? "text-ink4" : checked ? "text-ink" : "text-ink4"}`}>
                  {p.soon ? "SOON" : checked ? "✓" : "+"}
                </span>
              </div>
              <div className="text-[11px] text-ink4 mt-xs">{p.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-md mb-lg">
        <div>
          <div className="text-xs text-ink4 mb-sm">budget</div>
          <div className="flex items-center gap-xs">
            <span className="text-md text-ink3" dir="auto">$</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min={5}
              max={10000}
              step={50}
              className="flex-1 px-md py-sm bg-bg border-hairline border-border rounded-md text-md focus:outline-none focus:border-ink"
              disabled={create.isPending}
            />
          </div>
        </div>
        <div>
          <div className="text-xs text-ink4 mb-sm">duration</div>
          <div className="flex gap-xs">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                disabled={create.isPending}
                className={`flex-1 text-sm py-sm rounded-md border-hairline transition-colors ${
                  days === d
                    ? "border-ink bg-ink text-white"
                    : "border-border text-ink2 hover:border-ink"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {lowDailyWarning ? (
        <p className="text-xs text-attentionText mb-md">⚠ {lowDailyWarning}</p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={create.isPending || brief.trim().length < 10 || platforms.size === 0}
        className="w-full bg-ink text-white py-[13px] rounded-full text-md font-medium disabled:opacity-40 hover:opacity-85 transition-opacity"
      dir="auto">
        {create.isPending ? "drafting…" : "draft my campaign →"}
      </button>

      {create.isPending ? (
        <ThinkingIndicator
          phrases={[
            "reading your brand voice…",
            "checking what's worked before…",
            "designing the audience…",
            "writing creative angles…",
            "splitting budget across platforms…",
            "drawing the images…",
          ]}
        />
      ) : null}

      {create.error ? (
        <p className="text-sm text-urgent mt-md font-mono" dir="auto">
          {create.error.message}
        </p>
      ) : null}
    </Card>
  );
}

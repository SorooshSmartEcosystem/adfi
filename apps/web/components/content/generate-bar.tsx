"use client";

// GenerateBar — the big focused textarea at the top of /content.
//
// Replaces the old 6-tab filter bar + status pills. One job: tell ADFI
// what to post about, pick format + platform, hit draft. While the
// agent works the OrbLoader takes over the bar, status line cycles
// through Echo's drafting stages.
//
// Format/platform default to "let echo pick" — the agent infers from
// the brief if not specified. Once user picks a format we surface the
// channels that actually make sense for it.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { OrbLoader, STAGES_DRAFT_POST } from "../shared/orb-loader";

const FORMATS = [
  { value: "auto", label: "any format" },
  { value: "SINGLE_POST", label: "post" },
  { value: "CAROUSEL", label: "carousel" },
  { value: "REEL_SCRIPT", label: "reel" },
  { value: "STORY_SEQUENCE", label: "story" },
  { value: "EMAIL_NEWSLETTER", label: "newsletter" },
] as const;

const PLATFORMS = [
  { value: "auto", label: "any channel" },
  { value: "INSTAGRAM", label: "instagram" },
  { value: "FACEBOOK", label: "facebook" },
  { value: "TWITTER", label: "x / twitter" },
  { value: "LINKEDIN", label: "linkedin" },
  { value: "TELEGRAM", label: "telegram" },
  { value: "EMAIL", label: "email" },
] as const;

const PLACEHOLDER_ROTATION = [
  "what should we post about today?",
  "tell me what's happening — i'll write it.",
  "we just hit 200 paying users — thank-you post in our voice",
  "the kitchen renovation is finally done — show before/after",
  "drop a quick tip about saving on taxes this month",
  "today's mood, in one line",
];

const CHIP_SUGGESTIONS = [
  { label: "weekly recap", brief: "wrap up this week's wins for our audience" },
  { label: "launch teaser", brief: "tease the new thing we're shipping next week" },
  { label: "behind-the-scenes", brief: "what we're working on today, in our voice" },
  { label: "client win", brief: "celebrate a recent customer success" },
  { label: "faq answer", brief: "answer the question we get asked the most" },
];

export function GenerateBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [format, setFormat] = useState<string>("auto");
  const [platform, setPlatform] = useState<string>("auto");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Rotate the placeholder so the empty state has movement without
  // being an animation. ~6s per phrase.
  useEffect(() => {
    const id = setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_ROTATION.length),
      6000,
    );
    return () => clearInterval(id);
  }, []);

  const generate = trpc.content.generate.useMutation({
    onSuccess: () => {
      // Refresh the page server-side so the new draft appears in the
      // feed without a full reload.
      router.refresh();
      setText("");
    },
  });

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || generate.isPending) return;
    generate.mutate({
      hint: trimmed,
      format: format === "auto" ? undefined : (format as never),
      platform: platform === "auto" ? undefined : (platform as never),
    });
  }

  function applyChip(brief: string) {
    setText(brief);
  }

  if (generate.isPending) {
    return (
      <div className="bg-surface border-hairline border-border rounded-2xl p-2xl flex items-center justify-center min-h-[260px]">
        <OrbLoader
          tone="alive"
          size="md"
          stages={STAGES_DRAFT_POST}
        />
      </div>
    );
  }

  return (
    <div className="bg-surface border-hairline border-border rounded-2xl p-lg flex flex-col gap-md">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder={PLACEHOLDER_ROTATION[placeholderIdx]}
        rows={3}
        className="w-full bg-transparent border-0 outline-none resize-none text-md leading-relaxed text-ink placeholder:text-ink4"
        dir="auto"
      />

      <div className="flex items-center gap-sm flex-wrap">
        <Pill>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="bg-transparent border-0 outline-none font-mono text-xs text-ink2 cursor-pointer pr-1"
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Pill>
        <Pill>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-transparent border-0 outline-none font-mono text-xs text-ink2 cursor-pointer pr-1"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Pill>

        <span className="font-mono text-[10px] text-ink4 ml-auto hidden sm:inline">
          ⌘ + ENTER
        </span>

        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || generate.isPending}
          className="bg-ink text-white text-xs font-medium px-md py-[9px] rounded-full hover:opacity-85 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          draft post →
        </button>
      </div>

      {/* Chip suggestions — quiet hint for what to type */}
      <div className="flex items-center gap-xs flex-wrap">
        <span className="font-mono text-[10px] text-ink4 tracking-[0.18em] mr-xs">
          TRY:
        </span>
        {CHIP_SUGGESTIONS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => applyChip(c.brief)}
            className="font-mono text-[11px] text-ink3 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
          >
            {c.label}
          </button>
        ))}
      </div>

      {generate.error ? (
        <div className="font-mono text-[11px] text-urgent">
          {generate.error.message}
        </div>
      ) : null}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center bg-bg border-hairline border-border rounded-full px-md py-[5px]">
      {children}
    </div>
  );
}

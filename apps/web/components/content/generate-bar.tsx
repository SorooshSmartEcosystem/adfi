"use client";

// GenerateBar — minimal-by-default. Just a textarea + "draft post"
// button. Format/platform pickers live behind a single "options"
// toggle — most users default to "let echo pick" anyway.
//
// While the agent works the OrbLoader takes over.

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

const PLACEHOLDERS = [
  "what should we post about today?",
  "tell me what's happening — i'll write it.",
  "we just hit 200 paying users — thank-you post",
  "today's mood, in one line",
  "a quick reminder about the spring drop",
];

export function GenerateBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [format, setFormat] = useState<string>("auto");
  const [platform, setPlatform] = useState<string>("auto");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length),
      6000,
    );
    return () => clearInterval(id);
  }, []);

  const generate = trpc.content.generate.useMutation({
    onSuccess: () => {
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

  if (generate.isPending) {
    return (
      <div className="bg-surface border-hairline border-border rounded-2xl p-2xl flex items-center justify-center min-h-[200px]">
        <OrbLoader tone="alive" size="md" stages={STAGES_DRAFT_POST} />
      </div>
    );
  }

  const formatLabel = FORMATS.find((f) => f.value === format)?.label ?? "any format";
  const platformLabel =
    PLATFORMS.find((p) => p.value === platform)?.label ?? "any channel";

  return (
    <div className="bg-surface border-hairline border-border rounded-2xl px-lg py-md flex flex-col gap-sm">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder={PLACEHOLDERS[placeholderIdx]}
        rows={2}
        className="w-full bg-transparent border-0 outline-none resize-none text-md leading-relaxed text-ink placeholder:text-ink4"
        dir="auto"
      />

      <div className="flex items-center gap-sm flex-wrap">
        {/* One quiet options toggle — collapses format + platform pickers */}
        <button
          type="button"
          onClick={() => setOptionsOpen((v) => !v)}
          className="font-mono text-[11px] text-ink3 hover:text-ink transition-colors"
        >
          {optionsOpen ? "hide options" : `${formatLabel} · ${platformLabel} ▾`}
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || generate.isPending}
          className="ml-auto bg-ink text-white text-xs font-medium px-md py-[8px] rounded-full hover:opacity-85 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          draft post →
        </button>
      </div>

      {optionsOpen ? (
        <div className="flex items-center gap-sm flex-wrap pt-sm border-t-hairline border-border2">
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
        </div>
      ) : null}

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

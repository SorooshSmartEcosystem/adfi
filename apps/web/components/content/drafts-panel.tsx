"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { DraftCard } from "./draft-card";
import { PlatformFilter, type PlatformValue } from "./platform-filter";

type Format =
  | "AUTO"
  | "SINGLE_POST"
  | "CAROUSEL"
  | "REEL_SCRIPT"
  | "EMAIL_NEWSLETTER"
  | "STORY_SEQUENCE";

const FORMAT_OPTIONS: { id: Format; label: string }[] = [
  { id: "AUTO", label: "auto" },
  { id: "SINGLE_POST", label: "single post" },
  { id: "CAROUSEL", label: "carousel" },
  { id: "REEL_SCRIPT", label: "reel" },
  { id: "EMAIL_NEWSLETTER", label: "email" },
  { id: "STORY_SEQUENCE", label: "stories" },
];

const GEN_PLATFORM_OPTIONS: {
  id: Exclude<PlatformValue, "ALL">;
  label: string;
}[] = [
  { id: "INSTAGRAM", label: "instagram" },
  { id: "TWITTER", label: "twitter" },
  { id: "LINKEDIN", label: "linkedin" },
  { id: "FACEBOOK", label: "facebook" },
  { id: "TELEGRAM", label: "telegram" },
  { id: "WEBSITE_ARTICLE", label: "website article" },
  { id: "EMAIL", label: "email" },
];

export function DraftsPanel() {
  const [hint, setHint] = useState("");
  const [format, setFormat] = useState<Format>("AUTO");
  const [genPlatform, setGenPlatform] = useState<
    Exclude<PlatformValue, "ALL">
  >("INSTAGRAM");
  const [filter, setFilter] = useState<PlatformValue>("ALL");
  const utils = trpc.useUtils();

  const platformArg =
    filter === "ALL"
      ? undefined
      : (filter as Exclude<PlatformValue, "ALL">);

  const awaiting = trpc.content.listDrafts.useQuery({
    status: "AWAITING_REVIEW",
    limit: 30,
    platform: platformArg,
  });
  const approved = trpc.content.listDrafts.useQuery({
    status: "APPROVED",
    limit: 20,
    platform: platformArg,
  });

  const generate = trpc.content.generate.useMutation({
    onSuccess: () => {
      setHint("");
      utils.content.listDrafts.invalidate();
    },
  });

  const awaitingItems = awaiting.data?.items ?? [];
  const approvedItems = approved.data?.items ?? [];
  const isLoading = awaiting.isLoading || approved.isLoading;

  return (
    <>
      <div className="mb-xl">
        <div className="text-xs text-ink4 mb-sm">
          generate new
        </div>

        <div className="flex flex-wrap gap-xs mb-md">
          {FORMAT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={`text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
                format === f.id
                  ? "bg-ink text-white border-ink"
                  : "text-ink2 border-border hover:border-ink hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-xs mb-md">
          {GEN_PLATFORM_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setGenPlatform(p.id)}
              className={`text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
                genPlatform === p.id
                  ? "bg-ink text-white border-ink"
                  : "text-ink2 border-border hover:border-ink hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-sm">
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="optional hint (e.g. 'announce the spring drop', 'something quieter this week')"
            disabled={generate.isPending}
            className="flex-1 px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => {
              const payload: {
                hint?: string;
                format?: Exclude<Format, "AUTO">;
                platform?: Exclude<PlatformValue, "ALL">;
              } = { platform: genPlatform };
              if (hint.trim()) payload.hint = hint;
              if (format !== "AUTO") {
                payload.format = format;
                if (format === "EMAIL_NEWSLETTER") payload.platform = "EMAIL";
              }
              generate.mutate(payload);
            }}
            disabled={generate.isPending}
            className="bg-ink text-white text-xs px-md py-[10px] rounded-full disabled:opacity-40"
          >
            {generate.isPending ? "thinking..." : "write me one →"}
          </button>
        </div>
        {generate.error ? (
          <p className="text-sm text-urgent mt-sm">
            {generate.error.message}
          </p>
        ) : null}
      </div>

      <PlatformFilter
        value={filter}
        onChange={setFilter}
        label="filter drafts"
      />

      <section className="mb-xl">
        <div className="text-xs text-ink4 mb-md">
          needs your eyes · {awaitingItems.length}
        </div>
        {isLoading ? (
          <p className="text-sm text-ink3">one second</p>
        ) : awaitingItems.length === 0 ? (
          <div className="bg-surface rounded-md p-lg">
            <p className="text-md leading-relaxed mb-sm">
              {filter === "ALL"
                ? "inbox zero — nothing waiting for review."
                : `nothing waiting on ${filter.toLowerCase().replace(/_/g, " ")}.`}
            </p>
            <p className="text-sm text-ink3 leading-relaxed">
              echo drafts on the weekly cadence, or you can pick a format chip
              above and hit &apos;write me one&apos; for an on-demand draft.
              tip: pick the format that hasn&apos;t shipped recently to keep
              your feed varied.
            </p>
          </div>
        ) : (
          awaitingItems.map((d) => <DraftCard key={d.id} draft={d} />)
        )}
      </section>

      {approvedItems.length > 0 ? (
        <section className="mb-xl">
          <div className="text-xs text-ink4 mb-md">
            SCHEDULED · {approvedItems.length}
          </div>
          {approvedItems.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </section>
      ) : null}
    </>
  );
}

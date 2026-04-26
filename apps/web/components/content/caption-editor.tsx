"use client";
import { useState } from "react";

type Format =
  | "SINGLE_POST"
  | "CAROUSEL"
  | "REEL_SCRIPT"
  | "EMAIL_NEWSLETTER"
  | "STORY_SEQUENCE"
  | string;

// Slimmer editor for non-SINGLE_POST formats — edits the prose surface that
// the user will most want to tweak (caption + hashtags for socials, subject
// for newsletter). Falls back to caption editing for unknown formats.
export function CaptionEditor({
  format,
  initial,
  pending,
  onSave,
  onCancel,
}: {
  format: Format;
  initial: {
    caption?: string;
    hashtags?: string[];
    subject?: string;
  };
  pending: boolean;
  onSave: (next: {
    caption?: string;
    hashtags?: string[];
    subject?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [caption, setCaption] = useState(initial.caption ?? "");
  const [hashtagsRaw, setHashtagsRaw] = useState(
    (initial.hashtags ?? []).join(" "),
  );
  const [subject, setSubject] = useState(initial.subject ?? "");

  const isEmail = format === "EMAIL_NEWSLETTER";
  const showHashtags = !isEmail && format !== "STORY_SEQUENCE";

  return (
    <div className="flex flex-col gap-sm mb-md">
      {isEmail ? (
        <>
          <label className="font-mono text-[10px] tracking-[0.15em] text-ink4">
            SUBJECT LINE
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={140}
            className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-md focus:outline-none focus:border-ink"
          />
        </>
      ) : (
        <>
          <label className="font-mono text-[10px] tracking-[0.15em] text-ink4">
            CAPTION
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={6}
            className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-md leading-relaxed focus:outline-none focus:border-ink"
          />
        </>
      )}

      {showHashtags ? (
        <>
          <label className="font-mono text-[10px] tracking-[0.15em] text-ink4 mt-sm">
            HASHTAGS (space-separated)
          </label>
          <input
            value={hashtagsRaw}
            onChange={(e) => setHashtagsRaw(e.target.value)}
            placeholder="#example #more"
            className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-sm font-mono focus:outline-none focus:border-ink"
          />
        </>
      ) : null}

      <div className="flex items-center gap-sm pt-sm">
        <button
          type="button"
          onClick={() => {
            const tags = hashtagsRaw
              .split(/\s+/)
              .map((t) => t.trim())
              .filter(Boolean);
            onSave(
              isEmail
                ? { subject: subject.trim() }
                : showHashtags
                  ? { caption: caption.trim(), hashtags: tags }
                  : { caption: caption.trim() },
            );
          }}
          disabled={pending}
          className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
        >
          {pending ? "saving..." : "save edits"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          cancel
        </button>
      </div>
    </div>
  );
}

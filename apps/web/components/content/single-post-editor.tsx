"use client";
import { useState } from "react";

export function SinglePostEditor({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: {
    hook?: string;
    body?: string;
    cta?: string | null;
    hashtags?: string[];
  };
  pending: boolean;
  onSave: (next: {
    hook: string;
    body: string;
    cta: string | null;
    hashtags: string[];
  }) => void;
  onCancel: () => void;
}) {
  const [hook, setHook] = useState(initial.hook ?? "");
  const [body, setBody] = useState(initial.body ?? "");
  const [cta, setCta] = useState(initial.cta ?? "");
  const [hashtagsRaw, setHashtagsRaw] = useState(
    (initial.hashtags ?? []).join(" "),
  );

  return (
    <div className="flex flex-col gap-sm mb-md">
      <label className="font-mono text-[10px] tracking-[0.15em] text-ink4" dir="auto">
        HOOK
      </label>
      <textarea
        value={hook}
        onChange={(e) => setHook(e.target.value)}
        rows={2}
        className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-md leading-relaxed focus:outline-none focus:border-ink"
      />
      <label className="font-mono text-[10px] tracking-[0.15em] text-ink4 mt-sm" dir="auto">
        BODY
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-md leading-relaxed focus:outline-none focus:border-ink"
      />
      <label className="font-mono text-[10px] tracking-[0.15em] text-ink4 mt-sm" dir="auto">
        CTA (optional)
      </label>
      <input
        value={cta}
        onChange={(e) => setCta(e.target.value)}
        placeholder="dm me 'wholesale' if curious"
        className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-md focus:outline-none focus:border-ink"
      />
      <label className="font-mono text-[10px] tracking-[0.15em] text-ink4 mt-sm" dir="auto">
        HASHTAGS (space-separated)
      </label>
      <input
        value={hashtagsRaw}
        onChange={(e) => setHashtagsRaw(e.target.value)}
        placeholder="#example #more"
        className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-sm font-mono focus:outline-none focus:border-ink"
      />

      <div className="flex items-center gap-sm pt-sm">
        <button
          type="button"
          onClick={() =>
            onSave({
              hook: hook.trim(),
              body: body.trim(),
              cta: cta.trim() ? cta.trim() : null,
              hashtags: hashtagsRaw
                .split(/\s+/)
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
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
        dir="auto">
          cancel
        </button>
      </div>
    </div>
  );
}

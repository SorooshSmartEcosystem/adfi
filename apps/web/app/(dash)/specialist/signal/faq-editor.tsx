"use client";

// Free-form knowledge editor for Signal. The text typed here is
// injected verbatim into Signal's system prompt under a clearly
// labeled "Knowledge base" section, so it answers customer questions
// about hours, pricing, services, policies without making things up.
// Empty state falls back to brand voice + business description.

import { useState, useTransition } from "react";
import { trpc } from "../../../../lib/trpc";

const MAX_CHARS = 8000;

export function FaqEditor({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [savedText, setSavedText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, start] = useTransition();

  const setFaq = trpc.business.setFaq.useMutation();
  const dirty = text !== savedText;

  function onSave() {
    if (text.length > MAX_CHARS) {
      setError(`too long — keep it under ${MAX_CHARS} characters`);
      return;
    }
    setError(null);
    start(async () => {
      try {
        await setFaq.mutateAsync({ faqText: text });
        setSavedText(text);
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col gap-xs">
          <h2 className="text-sm font-medium">knowledge for signal</h2>
          <p className="text-xs font-mono text-ink4">
            paste anything signal should know — hours, pricing, services,
            policies. it'll quote this when answering customers.
          </p>
        </div>
        <p className="text-[11px] font-mono text-ink4">
          {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "open mon–fri 9–5\nfree consults — book at example.com/book\nrefunds within 14 days"
        }
        rows={10}
        className="w-full bg-surface border-hairline border-border rounded-lg px-md py-sm text-sm font-mono text-ink leading-relaxed resize-y focus:outline-none focus:border-ink3"
      />

      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || isPending}
          className="text-xs font-mono px-md py-sm rounded-full border-hairline border-alive text-alive hover:bg-alive hover:text-bg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-alive transition-colors"
        >
          {isPending ? "saving…" : "save"}
        </button>
        {error ? (
          <p className="text-[11px] font-mono text-urgent">{error}</p>
        ) : savedAt && !dirty ? (
          <p className="text-[11px] font-mono text-ink4">saved.</p>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";

type AudienceSegment = { name: string; description: string };
type BrandVoice = {
  voiceTone: string[];
  brandValues: string[];
  audienceSegments: AudienceSegment[];
  contentPillars: string[];
  doNotDoList: string[];
};

function StringList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <div className="font-mono text-[10px] text-ink4 tracking-[0.2em] mb-xs">
        {label}
      </div>
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-sm">
          <input
            value={v}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="flex-1 px-md py-sm bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="font-mono text-xs text-ink4 hover:text-urgent transition-colors px-sm"
            aria-label="remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="self-start font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
      >
        + add
      </button>
    </div>
  );
}

export function BrandVoiceEditor({
  initial,
  onClose,
}: {
  initial: BrandVoice;
  onClose: () => void;
}) {
  const [voice, setVoice] = useState<BrandVoice>({
    voiceTone: [...initial.voiceTone],
    brandValues: [...initial.brandValues],
    audienceSegments: initial.audienceSegments.map((a) => ({ ...a })),
    contentPillars: [...initial.contentPillars],
    doNotDoList: [...initial.doNotDoList],
  });

  const utils = trpc.useUtils();
  const update = trpc.agent.updateBrandVoice.useMutation({
    onSuccess: () => {
      utils.agent.getStrategistVoice.invalidate();
      onClose();
    },
  });

  const cleaned: BrandVoice = {
    voiceTone: voice.voiceTone.map((s) => s.trim()).filter(Boolean),
    brandValues: voice.brandValues.map((s) => s.trim()).filter(Boolean),
    audienceSegments: voice.audienceSegments
      .map((a) => ({ name: a.name.trim(), description: a.description.trim() }))
      .filter((a) => a.name && a.description),
    contentPillars: voice.contentPillars.map((s) => s.trim()).filter(Boolean),
    doNotDoList: voice.doNotDoList.map((s) => s.trim()).filter(Boolean),
  };

  return (
    <Card padded={false}>
      <div className="px-lg py-md hairline-b2 border-border2 flex items-center justify-between">
        <div className="font-mono text-sm text-ink4 tracking-[0.2em]">
          EDIT BRAND VOICE
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-xs text-ink4 hover:text-ink"
        >
          cancel
        </button>
      </div>

      <div className="px-lg py-md flex flex-col gap-lg">
        <StringList
          label="HOW YOU SOUND"
          items={voice.voiceTone}
          onChange={(v) => setVoice({ ...voice, voiceTone: v })}
          placeholder="warm, exact, never glib"
        />
        <StringList
          label="VALUES"
          items={voice.brandValues}
          onChange={(v) => setVoice({ ...voice, brandValues: v })}
          placeholder="craft over volume"
        />

        <div className="flex flex-col gap-xs">
          <div className="font-mono text-[10px] text-ink4 tracking-[0.2em] mb-xs">
            AUDIENCE
          </div>
          {voice.audienceSegments.map((seg, i) => (
            <div
              key={i}
              className="flex flex-col gap-xs border-hairline border-border rounded-md p-md"
            >
              <input
                value={seg.name}
                onChange={(e) => {
                  const next = [...voice.audienceSegments];
                  next[i] = { ...seg, name: e.target.value };
                  setVoice({ ...voice, audienceSegments: next });
                }}
                placeholder="segment name"
                className="px-md py-sm bg-bg border-hairline border-border rounded-md text-sm font-medium focus:outline-none focus:border-ink"
              />
              <textarea
                value={seg.description}
                onChange={(e) => {
                  const next = [...voice.audienceSegments];
                  next[i] = { ...seg, description: e.target.value };
                  setVoice({ ...voice, audienceSegments: next });
                }}
                rows={2}
                placeholder="who they are, what they care about"
                className="px-md py-sm bg-bg border-hairline border-border rounded-md text-sm leading-relaxed focus:outline-none focus:border-ink"
              />
              <button
                type="button"
                onClick={() =>
                  setVoice({
                    ...voice,
                    audienceSegments: voice.audienceSegments.filter(
                      (_, j) => j !== i,
                    ),
                  })
                }
                className="self-end font-mono text-xs text-ink4 hover:text-urgent transition-colors"
              >
                remove segment
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setVoice({
                ...voice,
                audienceSegments: [
                  ...voice.audienceSegments,
                  { name: "", description: "" },
                ],
              })
            }
            className="self-start font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
          >
            + add segment
          </button>
        </div>

        <StringList
          label="CONTENT PILLARS"
          items={voice.contentPillars}
          onChange={(v) => setVoice({ ...voice, contentPillars: v })}
          placeholder="behind-the-scenes craft notes"
        />
        <StringList
          label="THINGS I'LL AVOID"
          items={voice.doNotDoList}
          onChange={(v) => setVoice({ ...voice, doNotDoList: v })}
          placeholder="no growth-hack jargon"
        />

        {update.error ? (
          <p className="font-mono text-xs text-urgent">
            {update.error.message}
          </p>
        ) : null}

        <div className="flex items-center gap-sm pt-sm">
          <button
            type="button"
            onClick={() => update.mutate(cleaned)}
            disabled={update.isPending}
            className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
          >
            {update.isPending ? "saving..." : "save voice"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={update.isPending}
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            discard
          </button>
        </div>
      </div>
    </Card>
  );
}

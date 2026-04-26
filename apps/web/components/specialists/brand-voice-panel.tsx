"use client";

import { useState } from "react";
import { BrandVoiceView } from "./brand-voice-view";
import { BrandVoiceEditor } from "./brand-voice-editor";

type BrandVoice = {
  voiceTone?: string[];
  brandValues?: string[];
  audienceSegments?: { name: string; description: string }[];
  contentPillars?: string[];
  doNotDoList?: string[];
};

export function BrandVoicePanel({
  voice,
  lastRefreshedAt,
}: {
  voice: BrandVoice | null;
  lastRefreshedAt: Date | null;
}) {
  const [editing, setEditing] = useState(false);

  if (!voice) {
    return <BrandVoiceView voice={voice} lastRefreshedAt={lastRefreshedAt} />;
  }

  if (editing) {
    return (
      <BrandVoiceEditor
        initial={{
          voiceTone: voice.voiceTone ?? [],
          brandValues: voice.brandValues ?? [],
          audienceSegments: voice.audienceSegments ?? [],
          contentPillars: voice.contentPillars ?? [],
          doNotDoList: voice.doNotDoList ?? [],
        }}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="absolute top-0 right-0 z-10 font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors bg-white"
      >
        edit voice
      </button>
      <BrandVoiceView voice={voice} lastRefreshedAt={lastRefreshedAt} />
    </div>
  );
}

import { Card } from "../shared/card";

type BrandVoice = {
  voiceTone?: string[];
  brandValues?: string[];
  audienceSegments?: { name: string; description: string }[];
  contentPillars?: string[];
  doNotDoList?: string[];
};

function timeAgo(d: Date | null | undefined): string {
  if (!d) return "never refreshed";
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function BrandVoiceView({
  voice,
  lastRefreshedAt,
}: {
  voice: BrandVoice | null;
  lastRefreshedAt: Date | null;
}) {
  if (!voice) {
    return (
      <Card>
        <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
          NO VOICE YET
        </div>
        <p className="text-md text-ink3 leading-relaxed">
          finish onboarding (business description + goal) and i&apos;ll
          generate your brand voice here.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-md">
        <div className="font-mono text-sm text-ink4 tracking-[0.2em]">
          BRAND VOICE FINGERPRINT
        </div>
        <div className="font-mono text-xs text-ink4">
          refreshed {timeAgo(lastRefreshedAt)}
        </div>
      </div>

      {/*
        dir="auto" on every user-generated text container.
        Browser's bidi algorithm picks LTR or RTL per element based
        on the first strong character, so a Farsi voice fingerprint
        renders RTL while English ones stay LTR. Mixed strings (Farsi
        with embedded English brand names) also lay out correctly.
      */}

      <Card className="mb-md">
        <div className="font-mono text-[10px] text-aliveDark tracking-[0.2em] mb-sm">
          ● HOW YOU SOUND
        </div>
        <p className="text-md leading-relaxed" dir="auto">
          {(voice.voiceTone ?? []).join(" · ")}
        </p>
      </Card>

      <Card className="mb-md">
        <div className="font-mono text-[10px] text-aliveDark tracking-[0.2em] mb-sm">
          ● VALUES
        </div>
        <ul className="flex flex-wrap gap-xs">
          {(voice.brandValues ?? []).map((v) => (
            <li
              key={v}
              dir="auto"
              className="text-sm bg-surface px-md py-[5px] rounded-full"
            >
              {v}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-md">
        <div className="font-mono text-[10px] text-attentionText tracking-[0.2em] mb-sm">
          ● AUDIENCE
        </div>
        <ul className="flex flex-col gap-sm">
          {(voice.audienceSegments ?? []).map((seg) => (
            <li key={seg.name} dir="auto">
              <span className="text-md font-medium">{seg.name}</span>
              <span className="text-md text-ink3"> — {seg.description}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-md">
        <div className="font-mono text-[10px] text-ink4 tracking-[0.2em] mb-sm">
          ● CONTENT PILLARS
        </div>
        <ul className="flex flex-col gap-xs">
          {(voice.contentPillars ?? []).map((p) => (
            <li key={p} className="text-md leading-relaxed" dir="auto">
              · {p}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-md">
        <div className="font-mono text-[10px] text-urgent tracking-[0.2em] mb-sm">
          ● THINGS I&apos;LL AVOID
        </div>
        <ul className="flex flex-col gap-xs">
          {(voice.doNotDoList ?? []).map((d) => (
            <li key={d} className="text-md text-ink3 leading-relaxed" dir="auto">
              · {d}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

import { CarouselArtboard } from "./carousel-artboard";

// Renders the body of a draft based on its format. Each format has its
// own component so we don't end up with one giant if/else.

type Brief = {
  intent: string;
  audience: string;
  pillar: string;
  hookFramework: string;
};

function BriefRow({ brief }: { brief: Brief | null }) {
  if (!brief) return null;
  return (
    <div className="flex items-center gap-md flex-wrap mb-md">
      <span className="font-mono text-[10px] text-ink4 tracking-[0.15em]">
        intent: <span className="text-ink2">{brief.intent}</span>
      </span>
      <span className="font-mono text-[10px] text-ink4 tracking-[0.15em]">
        for: <span className="text-ink2">{brief.audience}</span>
      </span>
      <span className="font-mono text-[10px] text-ink4 tracking-[0.15em]">
        pillar: <span className="text-ink2">{brief.pillar}</span>
      </span>
      <span className="font-mono text-[10px] text-ink4 tracking-[0.15em]">
        hook: <span className="text-ink2">{brief.hookFramework}</span>
      </span>
    </div>
  );
}

function HashtagRow({ tags }: { tags: string[] | undefined }) {
  if (!tags || tags.length === 0) return null;
  return (
    <p className="text-sm text-ink3 font-mono mt-md">
      {tags.map((t) => `#${t.replace(/^#/, "")}`).join("  ")}
    </p>
  );
}

export function DraftBody({
  format,
  content,
}: {
  format: string;
  content: unknown;
}) {
  if (!content || typeof content !== "object") {
    return <p className="text-sm text-ink3">(empty)</p>;
  }
  const c = content as Record<string, unknown>;
  const brief = (c.brief as Brief | undefined) ?? null;

  if (format === "SINGLE_POST") {
    return (
      <>
        <BriefRow brief={brief} />
        <p className="text-md font-medium leading-relaxed mb-sm">
          {(c.hook as string) ?? ""}
        </p>
        <p className="text-md leading-relaxed whitespace-pre-wrap text-ink2">
          {(c.body as string) ?? ""}
        </p>
        {c.cta ? (
          <p className="text-md text-ink mt-md font-medium">
            {String(c.cta)}
          </p>
        ) : null}
        <HashtagRow tags={c.hashtags as string[] | undefined} />
      </>
    );
  }

  if (format === "CAROUSEL") {
    const cover = (c.coverSlide ?? {
      title: "(no cover)",
      subtitle: null,
      visualDirection: "",
      palette: "ink",
    }) as Parameters<typeof CarouselArtboard>[0]["cover"];
    const body = (c.bodySlides ?? []) as Parameters<
      typeof CarouselArtboard
    >[0]["body"];
    const closer = (c.closerSlide ?? {
      title: "",
      body: "",
      cta: null,
      palette: "ink",
    }) as Parameters<typeof CarouselArtboard>[0]["closer"];
    return (
      <>
        <BriefRow brief={brief} />
        <div className="font-mono text-xs text-ink4 tracking-[0.2em] mb-md">
          CAROUSEL · {body.length + 2} SLIDES
        </div>
        <CarouselArtboard cover={cover} body={body} closer={closer} />
        {c.caption ? (
          <p className="text-md leading-relaxed whitespace-pre-wrap text-ink2 mt-lg">
            {String(c.caption)}
          </p>
        ) : null}
        <HashtagRow tags={c.hashtags as string[] | undefined} />
      </>
    );
  }

  if (format === "REEL_SCRIPT") {
    const beats = (c.beats as
      | {
          timestamp: string;
          onScreenText: string;
          voiceover: string | null;
          bRoll: string;
        }[]
      | undefined) ?? [];
    return (
      <>
        <BriefRow brief={brief} />
        <div className="font-mono text-xs text-ink4 tracking-[0.2em] mb-sm">
          REEL · {beats.length} BEATS
        </div>
        <p className="text-md font-medium mb-md">
          🎬 hook (0:00): {(c.hook as string) ?? ""}
        </p>
        <div className="border-l-2 border-border pl-md flex flex-col gap-md mb-md">
          {beats.map((b, i) => (
            <div key={i}>
              <div className="font-mono text-xs text-aliveDark tracking-[0.15em] mb-xs">
                {b.timestamp}
              </div>
              <div className="text-md font-medium mb-xs">
                on-screen: {b.onScreenText}
              </div>
              {b.voiceover ? (
                <div className="text-sm text-ink2 mb-xs">
                  voiceover: {b.voiceover}
                </div>
              ) : null}
              <div className="text-sm text-ink3 italic">b-roll: {b.bRoll}</div>
            </div>
          ))}
        </div>
        {c.audioMood ? (
          <p className="text-sm text-ink3 font-mono mb-md">
            audio: {String(c.audioMood)}
          </p>
        ) : null}
        {c.caption ? (
          <p className="text-md text-ink2 whitespace-pre-wrap">
            {String(c.caption)}
          </p>
        ) : null}
        <HashtagRow tags={c.hashtags as string[] | undefined} />
      </>
    );
  }

  if (format === "EMAIL_NEWSLETTER") {
    const sections = (c.sections as
      | { heading: string | null; body: string }[]
      | undefined) ?? [];
    const cta = c.cta as
      | { label: string; intent: string; link: string | null }
      | undefined;
    return (
      <>
        <BriefRow brief={brief} />
        <div className="font-mono text-xs text-ink4 tracking-[0.2em] mb-sm">
          EMAIL
        </div>
        <div className="bg-bg border-hairline border-border rounded-md p-md mb-md">
          <div className="font-mono text-xs text-ink4 tracking-[0.15em] mb-xs">
            SUBJECT
          </div>
          <div className="text-md font-medium mb-md">
            {(c.subject as string) ?? ""}
          </div>
          <div className="font-mono text-xs text-ink4 tracking-[0.15em] mb-xs">
            PREHEADER
          </div>
          <div className="text-sm text-ink3">
            {(c.preheader as string) ?? ""}
          </div>
        </div>
        {sections.map((s, i) => (
          <div key={i} className="mb-md">
            {s.heading ? (
              <div className="text-md font-medium mb-xs">{s.heading}</div>
            ) : null}
            <p className="text-md leading-relaxed whitespace-pre-wrap text-ink2">
              {s.body}
            </p>
          </div>
        ))}
        {cta ? (
          <div className="mt-lg pt-md border-t-hairline border-border2">
            <div className="font-mono text-xs text-ink4 tracking-[0.15em] mb-xs">
              CTA · {cta.intent}
            </div>
            <div className="text-md font-medium">{cta.label}</div>
            {cta.link ? (
              <div className="font-mono text-xs text-ink4 mt-xs">
                {cta.link}
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  if (format === "STORY_SEQUENCE") {
    const frames = (c.frames as
      | {
          text: string;
          interaction: string;
          visualDirection: string;
        }[]
      | undefined) ?? [];
    return (
      <>
        <BriefRow brief={brief} />
        <div className="font-mono text-xs text-ink4 tracking-[0.2em] mb-md">
          STORIES · {frames.length} FRAMES
        </div>
        <div className="flex gap-sm overflow-x-auto pb-sm">
          {frames.map((f, i) => (
            <div
              key={i}
              className="shrink-0 w-[150px] bg-ink text-white rounded-md p-md flex flex-col justify-between min-h-[240px]"
            >
              <div className="font-mono text-[9px] tracking-[0.2em] opacity-50">
                FRAME {i + 1}
              </div>
              <div className="text-sm font-medium leading-tight">{f.text}</div>
              <div>
                {f.interaction !== "none" ? (
                  <div className="font-mono text-[9px] tracking-[0.15em] opacity-70 mb-xs">
                    {f.interaction.toUpperCase()}
                  </div>
                ) : null}
                <div className="font-mono text-[9px] opacity-50">
                  {f.visualDirection.slice(0, 60)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Fallback
  return (
    <pre className="text-xs text-ink3 overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}


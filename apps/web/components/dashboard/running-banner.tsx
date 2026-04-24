import { StatusDot } from "../shared/status-dot";

export function RunningBanner({
  headline,
  subhead,
}: {
  headline: string;
  subhead: string;
}) {
  return (
    <div className="mb-2xl">
      <div className="flex items-center gap-sm mb-md">
        <StatusDot tone="alive" animated />
        <span className="font-mono text-sm text-aliveDark tracking-[0.2em]">
          EVERYTHING IS RUNNING
        </span>
      </div>
      <h1 className="text-[clamp(28px,4vw,40px)] font-medium tracking-tight leading-[1.1] mb-sm">
        {headline}
      </h1>
      <p className="text-lg text-ink3">{subhead}</p>
    </div>
  );
}

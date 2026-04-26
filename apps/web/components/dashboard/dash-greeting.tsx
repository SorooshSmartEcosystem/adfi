import { LivePill } from "./live-pill";

function nowLabel(): string {
  const d = new Date();
  const day = d
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function DashGreeting({
  headline,
  subhead,
}: {
  headline: string;
  subhead: string;
}) {
  return (
    <div className="mb-2xl">
      <div className="flex items-center gap-md mb-md flex-wrap">
        <LivePill />
        <span className="font-mono text-xs text-ink4 tracking-wider">
          {nowLabel()}
        </span>
      </div>
      <h1
        className="font-medium tracking-tight leading-[1.1] mb-sm"
        style={{ fontSize: "clamp(26px, 3.5vw, 36px)" }}
      >
        {headline}
      </h1>
      <p className="text-md text-ink3">{subhead}</p>
    </div>
  );
}

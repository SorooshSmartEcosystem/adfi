import Link from "next/link";

type Status = "alive" | "idle" | "attn";

export type Channel = {
  name: string;
  handle: string;
  status: Status;
  primaryNum?: string;
  primaryLabel?: string;
  primaryDelta?: string;
  secondaryNum?: string;
  secondaryLabel?: string;
  secondaryDelta?: string;
  cta?: string;
  href?: string;
};

const ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  ),
  LinkedIn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="8" y1="11" x2="8" y2="17" />
      <circle cx="8" cy="7.5" r="0.8" fill="currentColor" />
      <path d="M12 17v-3.5a2.5 2.5 0 0 1 5 0V17" />
      <line x1="12" y1="11" x2="12" y2="17" />
    </svg>
  ),
  "Calls + SMS": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Facebook: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  Email: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  ),
};

const STATUS_DOT: Record<Status, string> = {
  alive: "bg-alive animate-pulse",
  idle: "bg-ink5",
  attn: "bg-attentionBorder",
};

export function ChannelsGrid({ channels }: { channels: Channel[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-md mb-2xl">
      {channels.map((c) => (
        <ChannelCard key={c.name} channel={c} />
      ))}
    </div>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  const Wrap = channel.href ? Link : "div";
  const wrapProps = channel.href
    ? { href: channel.href, className: "block" }
    : {};
  return (
    <Wrap {...(wrapProps as { href: string; className: string })}>
      <div
        className={`bg-white border-hairline border-border rounded-[14px] p-md transition-colors hover:border-ink ${
          channel.status === "idle" ? "opacity-70" : ""
        }`}
      >
        <div className="flex items-center gap-md mb-md">
          <div className="w-[32px] h-[32px] rounded-md bg-surface flex items-center justify-center text-ink shrink-0">
            {ICONS[channel.name] ?? ICONS.Email}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium leading-tight">{channel.name}</div>
            <div className="font-mono text-[10px] text-ink4 truncate">
              {channel.handle}
            </div>
          </div>
          <span
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${STATUS_DOT[channel.status]}`}
          />
        </div>

        {channel.status === "idle" ? (
          <div className="border-t-hairline border-border2 pt-md flex items-center justify-between">
            <span className="text-xs text-ink3">connect to enable</span>
            {channel.cta ? (
              <span className="font-mono text-xs text-ink">{channel.cta}</span>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-md border-t-hairline border-border2 pt-md">
            <Stat
              num={channel.primaryNum}
              label={channel.primaryLabel}
              delta={channel.primaryDelta}
            />
            <Stat
              num={channel.secondaryNum}
              label={channel.secondaryLabel}
              delta={channel.secondaryDelta}
            />
          </div>
        )}
      </div>
    </Wrap>
  );
}

function Stat({
  num,
  label,
  delta,
}: {
  num?: string;
  label?: string;
  delta?: string;
}) {
  if (!num) return <div />;
  return (
    <div>
      <div
        className="font-medium leading-none"
        style={{ fontSize: "18px", letterSpacing: "-0.015em" }}
      >
        {num}
      </div>
      {label ? (
        <div className="font-mono text-[9px] text-ink4 tracking-widest mt-xs">
          {label}
        </div>
      ) : null}
      {delta ? (
        <div className="font-mono text-[10px] text-aliveDark mt-[2px]">
          {delta}
        </div>
      ) : null}
    </div>
  );
}

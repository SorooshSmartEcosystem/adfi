import Link from "next/link";

type Status = "alive" | "idle";

export type Channel = {
  name: string;
  status: Status;
  num?: string;
  meta?: string;
  delta?: string;
  href?: string;
};

const ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  ),
  LinkedIn: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="8" y1="11" x2="8" y2="17" />
      <circle cx="8" cy="7.5" r="0.8" fill="currentColor" />
      <path d="M12 17v-3.5a2.5 2.5 0 0 1 5 0V17" />
    </svg>
  ),
  "calls + sms": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Facebook: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  Email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  ),
  "Telegram bot": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4 3 11l6 2 2 6 4-4 5 4 1-15z" />
    </svg>
  ),
  "Telegram channel": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-7-3 16-6-3-3 5-1-7z" />
      <path d="M9 13l5-4" />
    </svg>
  ),
};

export function ChannelsGrid({ channels }: { channels: Channel[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-[48px]">
      {channels.map((c) => (
        <ChannelCard key={c.name} channel={c} />
      ))}
    </div>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  const idle = channel.status === "idle";
  const Wrap = channel.href ? Link : "div";
  const wrapProps = channel.href
    ? { href: channel.href, className: "block" }
    : {};
  return (
    <Wrap {...(wrapProps as { href: string; className: string })}>
      <div
        className={`bg-white border-hairline border-border rounded-[14px] p-[18px] transition-colors hover:border-ink ${
          idle ? "opacity-55" : ""
        }`}
      >
        <div className="flex items-center gap-md mb-[18px]">
          <div className="w-7 h-7 rounded-[7px] bg-surface flex items-center justify-center text-ink shrink-0">
            {ICONS[channel.name] ?? ICONS.Email}
          </div>
          <div className="text-xs font-medium flex-1 truncate">
            {channel.name}
          </div>
          <span
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${
              idle ? "bg-ink5" : "bg-alive"
            }`}
          />
        </div>

        {idle ? (
          <div className="text-xs text-ink3 pt-[4px]">connect →</div>
        ) : channel.num ? (
          <>
            <div
              className="font-medium leading-none mb-[6px]"
              style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
            >
              {channel.num}
            </div>
            <div className="text-xs text-ink4">
              {channel.meta ?? ""}
              {channel.delta ? (
                <>
                  {channel.meta ? " · " : ""}
                  <span className="text-aliveDark">{channel.delta}</span>
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="text-xs text-aliveDark pt-[4px]">
            {channel.meta ?? "connected"}
          </div>
        )}
      </div>
    </Wrap>
  );
}

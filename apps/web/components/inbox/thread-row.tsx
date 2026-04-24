type ChannelLabel = "CALL" | "SMS" | "DM" | "EMAIL";

function channelLabel(channel: string): ChannelLabel {
  if (channel === "CALL") return "CALL";
  if (channel === "SMS") return "SMS";
  if (channel === "INSTAGRAM_DM") return "DM";
  return "EMAIL";
}

function timeLabel(at: Date): string {
  const diff = Date.now() - at.getTime();
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Item = {
  kind: "thread" | "call";
  id: string;
  channel: string;
  fromAddress: string;
  preview: string;
  at: Date;
  handled: boolean;
  booked?: boolean;
};

export function ThreadRow({
  item,
  active,
  isLast,
  onClick,
}: {
  item: Item;
  active: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const needsYou = !item.handled;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-lg py-md ${isLast ? "" : "hairline-b2 border-border2"} ${active ? "bg-surface" : "bg-white hover:bg-surface/60"} transition-colors`}
    >
      <div className="flex items-center justify-between mb-xs">
        <div className="flex items-center gap-sm flex-1 min-w-0">
          <span
            className={`font-mono text-sm tracking-[0.15em] ${needsYou ? "text-attentionText" : "text-aliveDark"}`}
          >
            {channelLabel(item.channel)}
          </span>
          <span className="text-md font-medium truncate">
            {item.fromAddress}
          </span>
          {item.booked ? <Badge tone="alive">BOOKED</Badge> : null}
          {needsYou ? <Badge tone="attn">NEEDS YOU</Badge> : null}
        </div>
        <span className="font-mono text-sm text-ink4 shrink-0">
          {timeLabel(item.at)}
        </span>
      </div>
      <div className="text-sm text-ink3 truncate">{item.preview}</div>
    </button>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "alive" | "attn";
}) {
  const cls =
    tone === "alive"
      ? "bg-alive text-[#1a4a2c]"
      : "bg-attentionBg text-attentionText";
  return (
    <span
      className={`font-mono text-[9px] px-[6px] py-[1px] rounded-full ${cls}`}
    >
      {children}
    </span>
  );
}

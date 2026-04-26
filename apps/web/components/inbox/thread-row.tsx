function channelLabel(channel: string): string {
  if (channel === "CALL") return "call";
  if (channel === "SMS") return "text";
  if (channel === "INSTAGRAM_DM") return "ig dm";
  if (channel === "MESSENGER") return "messenger";
  return "email";
}

function timeLabel(at: Date): string {
  const diff = Date.now() - at.getTime();
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return at
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toLowerCase();
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

// V3 simplified: drop CALL/SMS/DM mono pills + NEEDS YOU/BOOKED badges. The
// row carries state via a left-edge attn strip when unhandled, and the
// channel/booked status moves into a quiet meta line below the preview.
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
      className={`relative w-full text-left px-lg py-md transition-colors ${
        isLast ? "" : "border-b-hairline border-border2"
      } ${active ? "bg-surface" : "bg-white hover:bg-surface2"}`}
    >
      {needsYou ? (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-attentionBorder" />
      ) : null}
      <div className="flex items-center justify-between gap-md mb-[2px]">
        <div className="text-sm font-medium truncate">{item.fromAddress}</div>
        <div className="text-xs text-ink4 shrink-0">{timeLabel(item.at)}</div>
      </div>
      <div className="text-xs text-ink3 truncate mb-[4px]">{item.preview}</div>
      <div className="text-[11px] text-ink4">
        {channelLabel(item.channel)}
        {item.booked ? " · booked" : ""}
      </div>
    </button>
  );
}

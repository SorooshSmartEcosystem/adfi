function channelLabel(channel: string): string {
  if (channel === "CALL") return "call";
  if (channel === "SMS") return "text";
  if (channel === "INSTAGRAM_DM") return "ig dm";
  if (channel === "MESSENGER") return "messenger";
  if (channel === "TELEGRAM") return "telegram";
  if (channel === "EMAIL") return "email";
  return channel.toLowerCase();
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
  displayName?: string | null;
  avatarUrl?: string | null;
  preview: string;
  at: Date;
  handled: boolean;
  booked?: boolean;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

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
      <div className="flex items-start gap-md">
        {item.avatarUrl ? (
          <img
            src={item.avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full bg-surface shrink-0 mt-[2px] object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-[11px] font-medium shrink-0 mt-[2px]" dir="auto">
            {initialsOf(item.displayName ?? item.fromAddress)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-md mb-[2px]">
            <div className="text-sm font-medium truncate" dir="auto">
              {item.displayName ?? item.fromAddress}
            </div>
            <div className="text-xs text-ink4 shrink-0">
              {timeLabel(item.at)}
            </div>
          </div>
          <div className="text-xs text-ink3 truncate mb-[4px]" dir="auto">
            {item.preview}
          </div>
          <div className="text-[11px] text-ink4">
            {channelLabel(item.channel)}
            {item.booked ? " · booked" : ""}
          </div>
        </div>
      </div>
    </button>
  );
}

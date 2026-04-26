export type WorkingItem = {
  label: string;
  delta: string;
};

// V3 simplified: ranked list (1. 2. 3.) — label — lift. No progress bars,
// no "LAST 30 DAYS" mono pill. Caller passes already-sliced top 3.
export function WhatsWorking({
  items,
}: {
  items: WorkingItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white border-hairline border-border rounded-[16px] px-[22px] py-lg mb-[48px]">
        <p className="text-xs text-ink3 leading-[1.5]">
          not enough data yet — i&apos;ll learn what&apos;s landing as you publish.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-white border-hairline border-border rounded-[16px] py-md mb-[48px]">
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-[22px] py-md border-b-hairline border-border2 last:border-b-0"
        >
          <span className="text-xs text-ink4 w-6 shrink-0">{i + 1}.</span>
          <span className="text-sm flex-1">{it.label}</span>
          <span
            className={`text-xs shrink-0 ${
              it.delta.startsWith("-") ? "text-ink4" : "text-aliveDark"
            }`}
          >
            {it.delta}
          </span>
        </div>
      ))}
    </div>
  );
}

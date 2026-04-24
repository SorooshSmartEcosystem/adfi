import Link from "next/link";

type Tab = "week" | "drafts" | "performance";

const TABS: { id: Tab; label: string }[] = [
  { id: "week", label: "this week" },
  { id: "drafts", label: "drafts" },
  { id: "performance", label: "performance" },
];

export function ContentTabs({
  active,
  draftsCount,
}: {
  active: Tab;
  draftsCount: number;
}) {
  return (
    <div className="flex items-center gap-sm mb-xl flex-wrap">
      {TABS.map((t) => {
        const label =
          t.id === "drafts" && draftsCount > 0
            ? `${t.label} · ${draftsCount}`
            : t.label;
        const selected = active === t.id;
        return (
          <Link
            key={t.id}
            href={t.id === "week" ? "/content" : `/content?tab=${t.id}`}
            className={`font-mono text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
              selected
                ? "bg-ink text-white border-ink"
                : "text-ink2 border-border hover:border-ink hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

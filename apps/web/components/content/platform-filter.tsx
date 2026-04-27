"use client";

export type PlatformValue =
  | "ALL"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "LINKEDIN"
  | "TWITTER"
  | "TELEGRAM"
  | "WEBSITE_ARTICLE"
  | "EMAIL";

const OPTIONS: { id: PlatformValue; label: string }[] = [
  { id: "ALL", label: "all" },
  { id: "INSTAGRAM", label: "instagram" },
  { id: "TWITTER", label: "twitter" },
  { id: "LINKEDIN", label: "linkedin" },
  { id: "FACEBOOK", label: "facebook" },
  { id: "TELEGRAM", label: "telegram" },
  { id: "WEBSITE_ARTICLE", label: "website article" },
  { id: "EMAIL", label: "email" },
];

export function PlatformFilter({
  value,
  onChange,
  label = "platform",
}: {
  value: PlatformValue;
  onChange: (next: PlatformValue) => void;
  label?: string;
}) {
  return (
    <div className="mb-md">
      <div className="text-xs text-ink4 mb-sm">{label}</div>
      <div className="flex flex-wrap gap-xs">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
              value === o.id
                ? "bg-ink text-white border-ink"
                : "text-ink2 border-border hover:border-ink hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

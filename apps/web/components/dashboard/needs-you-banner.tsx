import Link from "next/link";

export function NeedsYouBanner({
  title,
  subtitle,
  cta = "tap to help →",
  href = "/inbox",
}: {
  title: string;
  subtitle?: string;
  cta?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-md bg-attentionBg border-hairline border-attentionBorder rounded-[18px] p-lg mb-2xl transition-transform hover:-translate-y-[1px]"
    >
      <span className="w-[40px] h-[40px] bg-white border-hairline border-attentionBorder rounded-full flex items-center justify-center shrink-0">
        <span className="w-[8px] h-[8px] rounded-full bg-attentionBorder" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] text-attentionText tracking-[0.2em] mb-xs">
          ONE THING NEEDS YOU
        </div>
        <div className="text-sm font-medium leading-[1.4] mb-[2px]">
          {title}
        </div>
        {subtitle ? (
          <div className="text-xs text-ink3">{subtitle}</div>
        ) : null}
      </div>
      <span className="font-mono text-sm text-attentionText shrink-0">
        →
      </span>
    </Link>
  );
}

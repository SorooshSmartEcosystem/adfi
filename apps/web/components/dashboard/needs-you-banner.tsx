import Link from "next/link";

// V3 simplified: no icon, no all-caps label. One title, one subline, arrow.
export function NeedsYouBanner({
  title,
  subtitle,
  href = "/inbox",
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-md bg-attentionBg border-hairline border-attentionBorder rounded-[16px] px-[22px] py-[20px] mb-[48px] transition-transform hover:-translate-y-[1px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium leading-[1.4] mb-[4px]">
          {title}
        </div>
        {subtitle ? (
          <div className="text-xs text-attentionText">{subtitle}</div>
        ) : null}
      </div>
      <span className="text-attentionText text-lg shrink-0" aria-hidden>
        →
      </span>
    </Link>
  );
}

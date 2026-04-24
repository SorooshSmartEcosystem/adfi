import Link from "next/link";
import { StatusDot } from "../shared/status-dot";

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
      className="block bg-attentionBg border-hairline border-attentionBorder rounded-[18px] p-lg mb-2xl transition-transform hover:-translate-y-[1px]"
    >
      <div className="flex items-center gap-sm mb-sm">
        <StatusDot tone="attn" />
        <span className="font-mono text-sm text-attentionText tracking-[0.2em]">
          ONE THING NEEDS YOU
        </span>
      </div>
      <p className="text-base font-medium leading-[1.4] mb-xs">{title}</p>
      {subtitle ? <p className="text-md text-ink3 mb-md">{subtitle}</p> : null}
      <span className="font-mono text-sm text-attentionText">{cta}</span>
    </Link>
  );
}

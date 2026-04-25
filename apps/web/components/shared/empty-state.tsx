import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "./card";
import { StatusDot } from "./status-dot";

type ActionShape = {
  label: string;
  href?: string;
  // Use either href (link) or onClick (client island) — both never together.
  // For server components, prefer href.
};

// Actionable empty state — soft warm card with a status dot, a clear
// reason, and one or two next steps. Keeps the tone calm: this isn't an
// error, it's a "here's what to do" moment.
export function EmptyState({
  tone = "neutral",
  label,
  title,
  body,
  primary,
  secondary,
  children,
  className = "",
}: {
  tone?: "neutral" | "alive" | "attn";
  label: string;
  title: string;
  body: ReactNode;
  primary?: ActionShape;
  secondary?: ActionShape;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-center gap-sm mb-sm">
        <StatusDot
          tone={tone === "alive" ? "alive" : tone === "attn" ? "attn" : "neutral"}
          animated={tone !== "neutral"}
        />
        <span className="font-mono text-sm text-ink4 tracking-[0.2em]">
          {label}
        </span>
      </div>
      <h3 className="text-lg font-medium tracking-tight mb-sm">{title}</h3>
      <div className="text-md text-ink3 leading-relaxed mb-md">{body}</div>
      {children}
      {(primary || secondary) && (
        <div className="flex items-center gap-sm flex-wrap mt-md">
          {primary?.href ? (
            <Link
              href={primary.href}
              className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full"
            >
              {primary.label}
            </Link>
          ) : null}
          {secondary?.href ? (
            <Link
              href={secondary.href}
              className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      )}
    </Card>
  );
}

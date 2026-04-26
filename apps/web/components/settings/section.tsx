import type { ReactNode } from "react";

export function Section({
  label,
  children,
  anchor,
}: {
  label: string;
  children: ReactNode;
  anchor?: string;
}) {
  return (
    <div id={anchor} className="mb-2xl scroll-mt-[80px]">
      <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
        {label}
      </div>
      {children}
    </div>
  );
}

export function Row({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-lg py-md ${isLast ? "" : "hairline-b2 border-border2"}`}
    >
      <span className="text-md text-ink3">{label}</span>
      <span className="text-md">{value}</span>
    </div>
  );
}

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`bg-white border-hairline border-border rounded-[16px] ${padded ? "p-[20px]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

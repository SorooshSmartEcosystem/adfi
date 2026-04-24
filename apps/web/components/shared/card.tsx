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
      className={`bg-white border-hairline border-border rounded-2xl ${padded ? "p-xl" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

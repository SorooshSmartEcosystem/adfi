import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`bg-white border-hairline border-border rounded-[16px] ${padded ? "p-[20px]" : ""} ${className} scroll-mt-[80px]`}
    >
      {children}
    </div>
  );
}

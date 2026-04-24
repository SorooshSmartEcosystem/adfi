import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={`w-full bg-ink text-white py-[13px] rounded-md text-md font-medium tracking-tight transition-opacity disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}

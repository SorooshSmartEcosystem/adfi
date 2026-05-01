"use client";

// FilterButton — quiet icon button that opens a popover with platform
// filter options. Replaces the row of platform pill chips so the
// content page top stays minimal.

import { useEffect, useRef, useState } from "react";
import type { PlatformValue } from "./platform-filter";

const PLATFORMS: { value: PlatformValue; label: string }[] = [
  { value: "ALL", label: "all platforms" },
  { value: "INSTAGRAM", label: "instagram" },
  { value: "TWITTER", label: "twitter / x" },
  { value: "LINKEDIN", label: "linkedin" },
  { value: "FACEBOOK", label: "facebook" },
  { value: "TELEGRAM", label: "telegram" },
  { value: "EMAIL", label: "email" },
];

export function FilterButton({
  value,
  onChange,
}: {
  value: PlatformValue;
  onChange: (v: PlatformValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const activeLabel = PLATFORMS.find((p) => p.value === value)?.label ?? "all";

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-center gap-xs w-8 h-8 rounded-full border-hairline transition-colors ${
          value === "ALL"
            ? "border-border text-ink3 hover:text-ink hover:border-ink"
            : "border-ink text-ink"
        }`}
        title={`filter: ${activeLabel}`}
        aria-label={`filter (${activeLabel})`}
      >
        {/* Funnel icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-xs bg-bg border-hairline border-border rounded-md p-xs z-20 min-w-[180px] shadow-lg">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                onChange(p.value);
                setOpen(false);
              }}
              className={`block w-full text-left text-xs px-sm py-[7px] rounded transition-colors ${
                p.value === value
                  ? "bg-surface text-ink font-medium"
                  : "text-ink2 hover:bg-surface"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

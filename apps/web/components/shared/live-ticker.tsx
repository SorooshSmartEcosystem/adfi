"use client";
import { useEffect, useState } from "react";

// Rotates through `events` every `interval` ms with a fade. Used on the
// dashboard banner area to convey "things are happening" — same energy
// as the mobile splash ticker.
export function LiveTicker({
  events,
  intervalMs = 3500,
  className = "",
}: {
  events: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (events.length <= 1) return;
    const id = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setIndex((i) => (i + 1) % events.length);
        setOpacity(1);
      }, 250);
    }, intervalMs);
    return () => clearInterval(id);
  }, [events.length, intervalMs]);

  if (events.length === 0) return null;

  return (
    <div
      className={`flex items-center gap-sm font-mono text-xs text-ink3 min-h-[18px] ${className}`}
    >
      <span className="w-[6px] h-[6px] rounded-full bg-alive animate-pulse-dot shrink-0" />
      <span
        className="transition-opacity duration-300"
        style={{ opacity }}
      >
        {events[index]}
      </span>
    </div>
  );
}

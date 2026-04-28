"use client";

import { useEffect, useState } from "react";

// Live micro-status card. Rotates through `phrases` every 4s with a 400ms
// fade. Below sits a shimmer bar — purely decorative; signals "I'm
// working, not frozen." Sits between the controls row and the agent's
// recent-output section.

export function CurrentlyCard({ phrases }: { phrases: string[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(id);
  }, [phrases.length]);

  return (
    <div className="bg-white border-hairline border-border rounded-2xl px-xl py-lg mb-xl relative overflow-hidden">
      <div className="text-xs text-ink4 mb-sm">currently</div>
      <p
        className="text-md text-ink leading-relaxed mb-md min-h-[22px] transition-opacity duration-[400ms]"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {phrases[idx] ?? ""}
      </p>
      <div className="h-[2px] bg-border2 rounded-full overflow-hidden relative progress-shimmer" />
    </div>
  );
}

// Subtle "the agent is thinking" affordance. Three pulsing dots paired
// with a status line that cycles through phrases on a 4s rotation —
// gives users something to watch instead of a frozen button while
// Echo / Strategist / Echo-image runs (10–60s typical).
//
// Voice rule (per CLAUDE.md): never "loading…" or "processing…".
// Phrases below say what the agent is *doing*.

"use client";
import { useEffect, useState } from "react";

const DEFAULT_PHRASES = [
  "thinking through your brand voice…",
  "checking what's worked before…",
  "writing a draft…",
  "drawing the image…",
  "double-checking the hook…",
];

export function ThinkingIndicator({
  phrases = DEFAULT_PHRASES,
  intervalMs = 4000,
}: {
  phrases?: string[];
  intervalMs?: number;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setI((v) => (v + 1) % phrases.length),
      intervalMs,
    );
    return () => clearInterval(t);
  }, [phrases, intervalMs]);

  return (
    <div className="flex items-center gap-sm py-sm" role="status" aria-live="polite">
      <span className="thinking-orb" aria-hidden />
      <span className="text-sm text-ink3 italic">{phrases[i]}</span>
      <style jsx>{`
        .thinking-orb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #5a5a5a 0%, #1a1815 70%);
          position: relative;
          flex-shrink: 0;
          animation: orb-breathe 1.6s ease-in-out infinite;
        }
        .thinking-orb::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 0.5px solid #1a1815;
          opacity: 0.18;
          animation: orb-ripple 1.6s ease-out infinite;
        }
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.92); }
        }
        @keyframes orb-ripple {
          0% { transform: scale(0.95); opacity: 0.3; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

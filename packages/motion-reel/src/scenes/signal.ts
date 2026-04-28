// Signal scene — "Signal handled a real customer interaction" Reel.
//
// 12-second choreography modeled on the landing-page Signal scene
// (see apps/web/components/landing-v4/landing-script.ts) but
// reformatted for 9:16 vertical (1080×1920) and parameterized so any
// business's brand + content fills the slots.
//
// Beats (timeline):
//   0.0s  — bg fade in + business mark drifts in at top
//   0.4s  — call orb breathes in centered
//   1.2s  — channel-label header types in
//   2.0s  — incoming-card draws up: from-identifier + customer message
//   4.5s  — reply-card fades up: "i replied" + reply summary
//   7.0s  — outcome-card slides up (amber): outcome line
//   9.5s  — stat ribbon at bottom: stat line counts in
//   11.5s — hold final state
//   12.0s — end
//
// Output is a complete standalone HTML document — `<html>` through
// `</html>`. The recorder loads it in headless Chromium, waits for
// `window.__readyForCapture__ = true`, captures frames, and stops at
// `durationSec`. Animations are pure CSS @keyframes driven by
// `animation-delay` so the timeline is deterministic.

import type { Scene, SignalSceneContent } from "../types";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;"
      : c === "<" ? "&lt;"
        : c === ">" ? "&gt;"
          : c === '"' ? "&quot;"
            : "&#39;",
  );
}

const FALLBACK_MARK_INNER = `
  <radialGradient id="orb-grad" cx="30%" cy="25%" r="80%">
    <stop offset="0%" stop-color="#5a5a5a"/>
    <stop offset="35%" stop-color="#2a2a2a"/>
    <stop offset="100%" stop-color="#000"/>
  </radialGradient>
  <circle cx="50" cy="50" r="48" fill="url(#orb-grad)"/>
  <ellipse cx="36" cy="32" rx="10" ry="6" fill="#fff" fill-opacity="0.32" transform="rotate(-25 36 32)"/>`;

export const signalScene: Scene<SignalSceneContent> = {
  id: "signal",
  label: "signal · handled a customer",
  durationSec: 12,
  width: 1080,
  height: 1920,
  html: (tokens, content) => {
    const channelLabel =
      content.channelLabel ??
      (content.channel === "CALL"
        ? "INCOMING CALL"
        : content.channel === "DM"
          ? "INSTAGRAM DM"
          : "SMS");
    const markInner = tokens.markInner ?? FALLBACK_MARK_INNER;

    // Note on units: the SVG canvas is 1080×1920 but we lay out in CSS
    // px — the page sets the viewport to exactly 1080×1920, so 1px in
    // CSS = 1px in the captured frame. No scaling needed.
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080, initial-scale=1">
<title>signal reel</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1080px; height: 1920px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif;
    background: ${tokens.bg};
    color: ${tokens.ink};
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
  }
  .mono { font-family: "SF Mono", "JetBrains Mono", monospace; }

  /* Stage */
  .stage {
    width: 1080px; height: 1920px;
    padding: 96px 80px 120px;
    display: flex; flex-direction: column; align-items: center;
    position: relative;
    opacity: 0;
    animation: stage-in 0.6s ease-out forwards;
  }
  @keyframes stage-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* Top: business mark + name */
  .brand {
    display: flex; align-items: center; gap: 18px;
    opacity: 0;
    animation: fade-down 0.7s ease-out 0.05s forwards;
  }
  .brand-mark {
    width: 56px; height: 56px;
    display: flex; align-items: center; justify-content: center;
  }
  .brand-mark svg {
    width: 100%; height: 100%;
    overflow: visible;
  }
  .brand-name {
    font-size: 28px; font-weight: 500; letter-spacing: -0.01em;
    color: ${tokens.ink};
  }
  @keyframes fade-down {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Call orb — centered, breathing */
  .orb-wrap {
    position: relative;
    width: 240px; height: 240px;
    margin: 96px 0 56px;
    opacity: 0;
    animation: orb-in 0.9s ease-out 0.4s forwards;
  }
  .orb-ring {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 0.5px solid rgba(17, 17, 17, 0.18);
    opacity: 0;
    animation: orb-ring 3.4s ease-out 1.6s infinite;
  }
  .orb-ring.delayed { animation-delay: 2.7s; }
  .orb-core {
    position: relative;
    width: 100%; height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%,
      #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%);
    box-shadow:
      inset -3px -4px 8px rgba(0,0,0,0.5),
      inset 3px 3px 6px rgba(255,255,255,0.06);
    animation: orb-breathe 3.4s ease-in-out 1.6s infinite;
  }
  .orb-core::before {
    content: '';
    position: absolute;
    top: 18%; left: 22%;
    width: 26%; height: 18%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 70%);
    border-radius: 50%;
    transform: rotate(-25deg);
  }
  @keyframes orb-in {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes orb-breathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.03); }
  }
  @keyframes orb-ring {
    0%   { transform: scale(1);   opacity: 0.5; }
    100% { transform: scale(1.9); opacity: 0;   }
  }

  /* Status label — "SIGNAL · LIVE 2:14PM" type bar */
  .status-bar {
    display: inline-flex; align-items: center; gap: 14px;
    padding: 12px 22px;
    border: 0.5px solid ${tokens.border};
    border-radius: 100px;
    background: ${tokens.surface};
    margin-bottom: 56px;
    opacity: 0;
    animation: fade-up 0.7s ease-out 1.2s forwards;
  }
  .status-bar .label {
    font-family: "SF Mono", monospace;
    font-size: 18px;
    color: ${tokens.aliveDark};
    letter-spacing: 0.08em;
  }
  .status-bar .dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    background: ${tokens.alive};
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Cards container */
  .cards {
    width: 100%;
    display: flex; flex-direction: column; gap: 24px;
    flex: 1;
  }
  .card {
    background: white;
    border: 0.5px solid ${tokens.border};
    border-radius: 28px;
    padding: 32px 36px;
    opacity: 0;
    animation-fill-mode: forwards;
    animation-name: card-in;
    animation-duration: 0.7s;
    animation-timing-function: cubic-bezier(0.2, 0, 0.1, 1);
  }
  .card.amber {
    background: ${tokens.attnBg};
    border-color: ${tokens.attnBorder};
  }
  @keyframes card-in {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .card-incoming { animation-delay: 2.0s; }
  .card-reply    { animation-delay: 4.5s; }
  .card-outcome  { animation-delay: 7.0s; }

  .channel-tag {
    display: inline-flex; align-items: center; gap: 10px;
    font-family: "SF Mono", monospace;
    font-size: 16px;
    color: ${tokens.ink3};
    letter-spacing: 0.08em;
    margin-bottom: 14px;
  }
  .channel-tag.amber {
    color: ${tokens.attnText};
  }
  .channel-tag::before {
    content: '';
    width: 8px; height: 8px;
    border-radius: 50%;
    background: ${tokens.aliveDark};
  }
  .channel-tag.amber::before {
    background: ${tokens.attnBorder};
  }

  .card-headline {
    font-size: 30px; font-weight: 500; letter-spacing: -0.01em;
    line-height: 1.25;
    color: ${tokens.ink};
    margin-bottom: 8px;
  }
  .card-quote {
    font-size: 26px;
    color: ${tokens.ink2};
    line-height: 1.4;
    font-style: italic;
  }
  .card-quote::before { content: '"'; }
  .card-quote::after  { content: '"'; }

  .card-meta {
    font-size: 22px;
    color: ${tokens.ink3};
    line-height: 1.4;
    margin-top: 10px;
  }

  /* Stat ribbon at the bottom */
  .stat {
    margin-top: 32px;
    width: 100%;
    text-align: center;
    opacity: 0;
    animation: fade-up 0.7s ease-out 9.5s forwards;
  }
  .stat-num {
    font-family: "SF Mono", monospace;
    font-size: 22px;
    color: ${tokens.aliveDark};
    letter-spacing: 0.06em;
  }
  .stat-num::before {
    content: '';
    display: inline-block;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: ${tokens.alive};
    margin-right: 12px;
    vertical-align: middle;
    animation: pulse-dot 2s ease-in-out infinite;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="brand">
      <div class="brand-mark">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${markInner}</svg>
      </div>
      <div class="brand-name">${escapeHtml(tokens.businessName)}</div>
    </div>

    <div class="orb-wrap">
      <div class="orb-ring"></div>
      <div class="orb-ring delayed"></div>
      <div class="orb-core"></div>
    </div>

    <div class="status-bar">
      <span class="dot"></span>
      <span class="label">SIGNAL · LIVE</span>
    </div>

    <div class="cards">
      <div class="card card-incoming">
        <div class="channel-tag">${escapeHtml(channelLabel)}</div>
        <div class="card-headline">${escapeHtml(content.fromIdentifier)}</div>
        <div class="card-quote">${escapeHtml(content.customerMessage)}</div>
      </div>

      <div class="card card-reply">
        <div class="channel-tag">REPLIED IN YOUR VOICE</div>
        <div class="card-meta">${escapeHtml(content.replySummary)}</div>
      </div>

      <div class="card card-outcome amber">
        <div class="channel-tag amber">BOOKED FOR YOU</div>
        <div class="card-headline">${escapeHtml(content.outcomeLine)}</div>
      </div>

      <div class="stat">
        <span class="stat-num">${escapeHtml(content.statLine)}</span>
      </div>
    </div>
  </div>

  <script>
    // The recorder waits for this flag before capturing — gives the
    // browser a frame to lay out before keyframes start ticking.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.__readyForCapture__ = true;
      });
    });
  </script>
</body>
</html>`;
  },
};

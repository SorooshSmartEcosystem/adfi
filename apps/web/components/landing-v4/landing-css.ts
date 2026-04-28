// V4 landing page CSS — ported verbatim from
// /prototype/ADFI_Landing_v4.html (lines 8-1784). Inlined as a string and
// rendered via a <style> tag in LandingV4 so the global body/html rules
// only apply while the landing is mounted (Next App Router CSS imports
// are app-wide otherwise, which would leak the body { background: #FAFAF7 }
// rule onto the dashboard).

export const LANDING_CSS = `\
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html { scroll-behavior: smooth; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
    background: #FAFAF7;
    color: #111;
    font-weight: 400;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  .mono { font-family: "SF Mono", "JetBrains Mono", "Courier New", monospace; }

  /* Layout container */
  .container {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .container-narrow {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Nav */
  nav {
    position: sticky;
    top: 0;
    background: rgba(250, 250, 247, 0.92);
    backdrop-filter: saturate(180%) blur(14px);
    -webkit-backdrop-filter: saturate(180%) blur(14px);
    z-index: 100;
    border-bottom: 0.5px solid #E5E3DB;
  }
  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    max-width: 1080px;
    margin: 0 auto;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    font-size: 15px;
    letter-spacing: -0.01em;
    color: #111;
    text-decoration: none;
  }
  .logo-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #333 0%, #111 60%);
    animation: breathe 3s ease-in-out infinite;
  }
  @keyframes breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .nav-link {
    color: #666;
    text-decoration: none;
    font-size: 13px;
    transition: color 0.15s;
  }
  .nav-link:hover { color: #111; }
  .nav-cta {
    background: #111;
    color: white;
    padding: 8px 14px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    transition: transform 0.15s;
  }
  .nav-cta:active { transform: scale(0.97); }
  .nav-user {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px 4px 4px;
    border: 0.5px solid #E5E3DB;
    border-radius: 100px;
    font-size: 13px;
    color: #111;
    text-decoration: none;
    transition: border-color 0.15s;
    max-width: 180px;
  }
  .nav-user:hover { border-color: #111; }
  .nav-user-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    background: #F5F4EE;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 500;
    color: #666;
    flex-shrink: 0;
  }
  .nav-user-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Hero v5 — minimal centered orb + headline + textarea + CTA, with
     four corner cards fading in/out on independent loops to suggest
     live agent activity. Replaces the old side-by-side hero+canvas. */
  .hero {
    position: relative;
    min-height: 760px;
    padding: 60px 24px 80px;
    overflow: hidden;
  }
  @media (max-width: 700px) {
    .hero { min-height: auto; padding: 40px 20px 60px; }
  }
  .hero-inner {
    position: relative;
    max-width: 720px;
    margin: 0 auto;
    text-align: center;
    z-index: 5;
  }
  .orb-wrap {
    position: relative;
    width: 96px;
    height: 96px;
    margin: 40px auto 28px;
  }
  @media (max-width: 700px) {
    .orb-wrap { width: 80px; height: 80px; margin: 24px auto 22px; }
  }
  .orb-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 0.5px solid rgba(17, 17, 17, 0.18);
    animation: ring-pulse 2.4s ease-out infinite;
    opacity: 0;
    pointer-events: none;
  }
  .orb-ring:nth-child(2) { animation-delay: 0.8s; }
  .orb-ring:nth-child(3) { animation-delay: 1.6s; }
  @keyframes ring-pulse {
    0%   { transform: scale(1);   opacity: 0.6; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  .orb-3d {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%,
      #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%);
    box-shadow:
      inset -6px -10px 20px rgba(0,0,0,0.5),
      inset 6px 6px 14px rgba(255,255,255,0.06),
      0 18px 36px rgba(0,0,0,0.12);
    animation: orb-breathe 3.2s ease-in-out infinite;
    z-index: 2;
  }
  .orb-3d::before {
    content: '';
    position: absolute;
    top: 18%; left: 22%;
    width: 26%; height: 18%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 70%);
    border-radius: 50%;
    transform: rotate(-25deg);
  }
  .orb-3d::after {
    content: '';
    position: absolute;
    bottom: 12%; right: 18%;
    width: 22%; height: 14%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
  @keyframes orb-breathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
  }
  .wordmark {
    font-size: 17px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: #111;
    margin-bottom: 32px;
  }
  @media (max-width: 700px) {
    .wordmark { font-size: 15px; margin-bottom: 24px; }
  }
  .hero-h1 {
    font-size: clamp(32px, 5vw, 48px);
    font-weight: 500;
    letter-spacing: -0.035em;
    line-height: 1.05;
    margin-bottom: 14px;
    color: #111;
  }
  .hero-sub {
    font-size: clamp(15px, 2vw, 17px);
    color: #666;
    margin-bottom: 32px;
    line-height: 1.5;
  }

  /* Hero form — textarea + continue button. */
  .form-wrap {
    max-width: 540px;
    margin: 0 auto;
    text-align: center;
    position: relative;
  }
  .business-textarea {
    width: 100%;
    min-height: 110px;
    padding: 18px 20px;
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 16px;
    font-size: 15px;
    color: #111;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
    -webkit-appearance: none;
    text-align: left;
    font-family: inherit;
  }
  .business-textarea::placeholder { color: #aaa; }
  .business-textarea:focus {
    outline: none;
    border-color: #111;
    box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.04);
  }
  .continue-btn {
    background: #111;
    color: white;
    padding: 18px 36px;
    margin-top: 18px;
    border-radius: 100px;
    font-size: 16px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, background 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 200px;
    justify-content: center;
    font-family: inherit;
  }
  .continue-btn:hover { background: #000; }
  .continue-btn:active { transform: scale(0.97); }
  @media (max-width: 700px) {
    .continue-btn { padding: 16px 32px; font-size: 15px; }
  }

  /* Corner cards — desktop only. Each loops independently with
     staggered delays so the page never feels static. */
  .corner {
    position: absolute;
    pointer-events: none;
    z-index: 1;
  }
  .corner-card {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 12px;
    padding: 10px 12px;
    width: 200px;
    box-shadow: 0 8px 22px rgba(0,0,0,0.05);
    opacity: 0;
    animation: corner-cycle 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
  .corner-tl { top: 80px;    left: 40px; }
  .corner-tr { top: 110px;   right: 40px; }
  .corner-bl { bottom: 80px; left: 60px; }
  .corner-br { bottom: 110px; right: 60px; }
  .corner-tl .corner-card { animation-delay: 0s; }
  .corner-tr .corner-card { animation-delay: 0.9s; }
  .corner-bl .corner-card { animation-delay: 1.8s; }
  .corner-br .corner-card { animation-delay: 2.6s; }
  @keyframes corner-cycle {
    0%   { opacity: 0; transform: translateY(8px) scale(0.96); }
    14%  { opacity: 1; transform: translateY(0)   scale(1); }
    80%  { opacity: 1; transform: translateY(0)   scale(1); }
    100% { opacity: 0; transform: translateY(-4px) scale(0.98); }
  }
  .corner .cc-mono {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.12em;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .corner .cc-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
  }
  .corner .cc-dot.alive  { background: #7CE896; }
  .corner .cc-dot.urgent { background: #C84A3E; }
  .corner .cc-dot.attn   { background: #F0D98C; }
  .corner .cc-dot.ink    { background: #111; }
  .corner .cc-title {
    font-size: 11.5px;
    font-weight: 500;
    line-height: 1.3;
    color: #111;
  }
  .corner .cc-meta {
    font-size: 10.5px;
    color: #666;
    line-height: 1.4;
    margin-top: 2px;
  }
  .corner-card.amber {
    background: #FFF9ED;
    border-color: #F0D98C;
  }
  .corner-card.amber .cc-mono { color: #8a6a1e; }

  /* Mobile ticker — replaces corner cards on small screens. */
  @media (max-width: 700px) {
    .corner { display: none; }
    .mobile-ticker {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      margin-top: 32px;
      padding: 8px 0 20px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .mobile-ticker::-webkit-scrollbar { display: none; }
    .ticker-card {
      flex-shrink: 0;
      background: white;
      border: 0.5px solid #E5E3DB;
      border-radius: 100px;
      padding: 8px 14px;
      font-size: 11px;
      color: #666;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      animation: ticker-pulse 3.5s ease-in-out infinite;
    }
    .ticker-card:nth-child(2) { animation-delay: 0.9s; }
    .ticker-card:nth-child(3) { animation-delay: 1.8s; }
    .ticker-card:nth-child(4) { animation-delay: 2.6s; }
    .ticker-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .ticker-dot.alive  { background: #7CE896; }
    .ticker-dot.urgent { background: #C84A3E; }
    .ticker-dot.attn   { background: #F0D98C; }
    .ticker-dot.ink    { background: #111; }
    @keyframes ticker-pulse {
      0%, 100% { opacity: 0.5; }
      50%      { opacity: 1; }
    }
  }
  @media (min-width: 701px) {
    .mobile-ticker { display: none; }
  }
  /* Legacy hero rules below — kept inert so any remaining references
     don't cause unstyled fallbacks; the new .hero-inner / .hero-h1 /
     .hero-sub / .form-wrap above are the ones in use as of v5. */
  .hero-ctas {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  @media (min-width: 960px) {
    .hero-ctas { justify-content: flex-start; }
  }
  .btn-primary {
    background: #111;
    color: white;
    padding: 14px 26px;
    border-radius: 100px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.15s;
    border: none;
    cursor: pointer;
  }
  .btn-primary:active { transform: scale(0.97); }
  .btn-secondary {
    background: transparent;
    color: #111;
    padding: 14px 22px;
    border-radius: 100px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    border: 0.5px solid #E5E3DB;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s;
    cursor: pointer;
  }
  .btn-secondary:hover { border-color: #111; }
  .hero-note {
    font-family: "SF Mono", monospace;
    font-size: 11px;
    color: #999;
    letter-spacing: 0.05em;
  }

  /* Hero v2 — professional polish */
  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 100px;
    padding: 6px 12px 6px 10px;
    margin-bottom: 28px;
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #666;
    letter-spacing: 0.12em;
  }
  .hero-eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7CE896;
    animation: pulse-ring-small 2s ease-in-out infinite;
  }
  @keyframes pulse-ring-small {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .hero-trust-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  @media (min-width: 960px) {
    .hero-trust-row { justify-content: flex-start; }
  }
  .hero-trust-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #888;
    letter-spacing: 0.08em;
  }
  .hero-trust-item::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #111;
    opacity: 0.4;
  }

  /* ===================================
     HERO CANVAS — auto-playing capability demo
  =================================== */
  .canvas {
    position: relative;
    width: 100%;
    height: 480px;
    margin: 0 auto;
    border-radius: 22px;
    background: linear-gradient(180deg, #FAFAF7 0%, #F4F2EA 100%);
    border: 0.5px solid #E5E3DB;
    overflow: hidden;
  }
  @media (min-width: 960px) {
    .canvas { height: 540px; }
  }
  @media (max-width: 600px) {
    .canvas { height: 460px; border-radius: 18px; }
  }

  /* Canvas tabs — sit at the top of the canvas. Active tab has the
     fill bar animating during auto-rotate. Manual click pauses auto. */
  .canvas-tabs {
    position: absolute;
    top: 14px;
    left: 14px;
    right: 14px;
    z-index: 5;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }
  .canvas-tab {
    position: relative;
    padding: 6px 4px 8px;
    background: rgba(255, 255, 255, 0.7);
    border: 0.5px solid rgba(26, 24, 21, 0.08);
    border-radius: 999px;
    font-family: inherit;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b6964;
    cursor: pointer;
    overflow: hidden;
    transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .canvas-tab:hover { color: #1a1815; border-color: rgba(26, 24, 21, 0.18); }
  .canvas-tab.active {
    color: #1a1815;
    background: #fff;
    border-color: rgba(26, 24, 21, 0.18);
  }
  .canvas-tab-label { position: relative; z-index: 2; pointer-events: none; }
  .canvas-tab-progress {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 2px;
    background: #1a1815;
    transform: scaleX(0);
    transform-origin: left center;
    pointer-events: none;
  }
  .canvas.paused .canvas-tab-progress { transform: scaleX(0) !important; }
  @media (max-width: 600px) {
    .canvas-tab { font-size: 9px; padding: 5px 2px 7px; letter-spacing: 0.06em; }
  }

  /* Pause / play affordance — sits in the bottom-right corner of the
     canvas. Switches between ⏸ and ▶ depending on mode. */
  .canvas-pause {
    position: absolute;
    bottom: 14px;
    right: 14px;
    z-index: 5;
    width: 32px; height: 32px;
    border-radius: 50%;
    border: 0.5px solid rgba(26, 24, 21, 0.18);
    background: rgba(255, 255, 255, 0.85);
    color: #1a1815;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.18s ease, border-color 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .canvas-pause:hover {
    background: #fff;
    border-color: #1a1815;
  }
  .canvas-pause-icon { line-height: 1; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) {
    .canvas-tab-progress { display: none; }
  }
  .canvas::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 380px; height: 380px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(17,17,17,0.04) 0%, transparent 70%);
    pointer-events: none;
  }
  .orb-stage {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .orb-stage.tilt-left { transform: translate(-50%, -50%) translateX(-8px); }
  .orb-stage.tilt-right { transform: translate(-50%, -50%) translateX(8px); }
  .canvas-orb {
    width: 130px;
    height: 130px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%,
      #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%);
    box-shadow:
      inset -8px -12px 24px rgba(0,0,0,0.5),
      inset 8px 8px 16px rgba(255,255,255,0.06),
      0 25px 50px rgba(0,0,0,0.15);
    position: relative;
    animation: orb-breathe 3.5s ease-in-out infinite;
    transition: box-shadow 0.6s ease;
  }
  @media (max-width: 600px) {
    .canvas-orb { width: 100px; height: 100px; }
  }
  .canvas-orb::before {
    content: '';
    position: absolute;
    top: 18%; left: 22%;
    width: 28px; height: 20px;
    background: radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 70%);
    border-radius: 50%;
    transform: rotate(-25deg);
  }
  .canvas-orb::after {
    content: '';
    position: absolute;
    bottom: 12%; right: 18%;
    width: 24px; height: 16px;
    background: radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
  @keyframes orb-breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.04); }
  }
  .canvas-orb.mode-call {
    box-shadow:
      inset -8px -12px 24px rgba(0,0,0,0.5),
      inset 8px 8px 16px rgba(255,255,255,0.06),
      0 0 0 8px rgba(200, 74, 62, 0.06),
      0 0 0 18px rgba(200, 74, 62, 0.03),
      0 25px 50px rgba(0,0,0,0.15);
  }
  .canvas-orb.mode-dm {
    box-shadow:
      inset -8px -12px 24px rgba(0,0,0,0.5),
      inset 8px 8px 16px rgba(255,255,255,0.06),
      0 0 0 8px rgba(124, 232, 150, 0.10),
      0 0 0 20px rgba(124, 232, 150, 0.04),
      0 25px 50px rgba(0,0,0,0.15);
  }
  .canvas-orb.mode-content {
    box-shadow:
      inset -8px -12px 24px rgba(0,0,0,0.5),
      inset 8px 8px 16px rgba(255,255,255,0.06),
      0 0 0 8px rgba(17, 17, 17, 0.05),
      0 25px 50px rgba(0,0,0,0.15);
  }
  .canvas-orb.mode-scout {
    box-shadow:
      inset -8px -12px 24px rgba(0,0,0,0.5),
      inset 8px 8px 16px rgba(255,255,255,0.06),
      0 0 0 8px rgba(240, 217, 140, 0.18),
      0 25px 50px rgba(0,0,0,0.15);
  }
  .canvas-orb.mode-dash {
    box-shadow:
      inset -8px -12px 24px rgba(0,0,0,0.5),
      inset 8px 8px 16px rgba(255,255,255,0.06),
      0 0 0 8px rgba(124, 232, 150, 0.15),
      0 0 0 24px rgba(124, 232, 150, 0.05),
      0 25px 50px rgba(0,0,0,0.15);
  }

  .canvas-card {
    position: absolute;
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 14px;
    padding: 12px 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    z-index: 6;
  }
  .canvas-card.show {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  .cc-mono {
    font-family: "SF Mono", monospace;
    font-size: 9.5px;
    color: #888;
    letter-spacing: 0.15em;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cc-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
  }
  .cc-dot.alive { background: #7CE896; }
  .cc-dot.urgent { background: #C84A3E; }
  .cc-dot.attn { background: #F0D98C; }
  .cc-dot.ink { background: #111; }
  .cc-title {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.3;
    margin-bottom: 4px;
  }
  .cc-meta {
    font-size: 11px;
    color: #666;
    line-height: 1.4;
  }
  .cc-tag {
    display: inline-block;
    margin-top: 8px;
    padding: 3px 8px;
    border-radius: 100px;
    font-family: "SF Mono", monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
  }
  .cc-tag.alive { background: rgba(124, 232, 150, 0.15); color: #3a9d5c; }
  .cc-tag.attn { background: #FFF9ED; color: #8a6a1e; }

  /* Per-moment positions */
  .canvas .cc-call {
    top: 30px; left: 30px;
    width: 230px;
  }
  @media (max-width: 600px) {
    .canvas .cc-call { width: 210px; left: 16px; top: 20px; }
  }
  .canvas .cc-dm-card {
    width: 195px;
    padding: 10px 12px;
  }
  @media (max-width: 600px) {
    .canvas .cc-dm-card { width: 175px; }
  }
  .canvas .cc-dm-1 { top: 50px; left: 40px; }
  .canvas .cc-dm-2 { top: 130px; left: 20px; }
  .canvas .cc-dm-3 { top: 70px; right: 30px; }
  @media (max-width: 600px) {
    .canvas .cc-dm-1 { top: 30px; left: 16px; }
    .canvas .cc-dm-2 { top: 110px; left: 8px; }
    .canvas .cc-dm-3 { top: 50px; right: 16px; }
  }
  .cc-dm-platform {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 6px;
  }
  .cc-dm-icon {
    width: 18px; height: 18px;
    border-radius: 5px;
    background: #F2EFE5;
    display: flex; align-items: center; justify-content: center;
  }
  .cc-dm-name {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.1em;
  }
  .cc-dm-status {
    margin-left: auto;
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #3a9d5c;
  }
  .cc-dm-text {
    font-size: 11px;
    line-height: 1.45;
  }
  .cc-dm-from {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    margin-top: 4px;
  }
  .canvas .cc-dm-summary {
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(20px) scale(0.95);
    background: #111;
    color: white;
    padding: 10px 18px;
    border-radius: 100px;
    border: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    font-size: 12px;
    font-weight: 500;
  }
  .canvas .cc-dm-summary.show {
    transform: translateX(-50%) translateY(0) scale(1);
  }

  .canvas .cc-post {
    top: 30px; right: 30px;
    width: 220px;
    padding: 0;
    overflow: hidden;
  }
  @media (max-width: 600px) {
    .canvas .cc-post { width: 195px; right: 16px; top: 20px; }
  }
  .cc-post-img {
    height: 110px;
    background: linear-gradient(135deg, #C9A881 0%, #8B6F47 100%);
    position: relative;
  }
  .cc-post-img::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 25% 30%, rgba(255,255,255,0.15) 0%, transparent 40%),
      radial-gradient(circle at 75% 70%, rgba(0,0,0,0.2) 0%, transparent 50%);
  }
  .cc-post-body { padding: 12px 14px; }
  .cc-post-cap {
    font-size: 11px;
    line-height: 1.4;
    margin-bottom: 6px;
  }
  .cc-post-stats {
    display: flex; gap: 12px;
    font-family: "SF Mono", monospace;
    font-size: 9.5px;
    color: #888;
  }
  .canvas .cc-drafting {
    bottom: 50px; left: 30px;
    width: 195px;
    background: #111;
    color: white;
    border: none;
  }
  @media (max-width: 600px) {
    .canvas .cc-drafting { left: 16px; bottom: 30px; width: 175px; }
  }
  .canvas .cc-drafting .cc-mono { color: rgba(255,255,255,0.5); }
  .cc-drafting-text {
    font-size: 12px;
    color: white;
    display: flex; align-items: center; gap: 4px;
  }
  .cc-cursor {
    display: inline-block;
    width: 1.5px;
    height: 12px;
    background: white;
    animation: cursor-blink 0.8s steps(2) infinite;
  }
  @keyframes cursor-blink {
    0%, 50% { opacity: 1; }
    50.01%, 100% { opacity: 0; }
  }

  .canvas .cc-scout {
    top: 50%;
    right: 30px;
    transform: translateY(-50%) translateY(20px) scale(0.95);
    width: 240px;
    background: #FFF9ED;
    border-color: #F0D98C;
  }
  .canvas .cc-scout.show {
    transform: translateY(-50%) translateY(0) scale(1);
  }
  @media (max-width: 600px) {
    .canvas .cc-scout { right: 16px; width: 220px; }
  }

  .canvas .cc-kpi { width: 150px; }
  .canvas .cc-kpi-1 { top: 30px; left: 30px; }
  .canvas .cc-kpi-2 { top: 140px; left: 50px; }
  .canvas .cc-kpi-3 { top: 30px; right: 30px; }
  .canvas .cc-kpi-4 { top: 140px; right: 50px; }
  @media (max-width: 600px) {
    .canvas .cc-kpi { width: 130px; }
    .canvas .cc-kpi-1 { left: 12px; top: 20px; }
    .canvas .cc-kpi-2 { left: 28px; top: 100px; }
    .canvas .cc-kpi-3 { right: 12px; top: 20px; }
    .canvas .cc-kpi-4 { right: 28px; top: 100px; }
  }
  .cc-kpi-label {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.15em;
    margin-bottom: 6px;
  }
  .cc-kpi-num {
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1;
    margin-bottom: 4px;
  }
  .cc-kpi-delta {
    font-size: 10px;
    color: #3a9d5c;
    font-family: "SF Mono", monospace;
  }

  .canvas-caption {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(17, 17, 17, 0.92);
    backdrop-filter: blur(10px);
    color: white;
    padding: 8px 14px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    transition: opacity 0.4s ease;
    z-index: 10;
    max-width: calc(100% - 40px);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 600px) {
    .canvas-caption { font-size: 11px; padding: 7px 12px; bottom: 16px; }
  }
  /* Step dots — kept for back-compat; the canvas tabs above are the
     primary navigator now. Hidden visually so the tabs aren't shadowed
     by a redundant indicator. */
  .canvas-step-dots {
    display: none;
  }
  .canvas-step-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: rgba(17, 17, 17, 0.15);
    transition: background 0.3s, width 0.3s;
  }
  .canvas-step-dot.active {
    background: #111;
    width: 18px;
    border-radius: 3px;
  }

  /* ===================================
     DMS EVERYWHERE — dedicated section
  =================================== */
  .dms-section {
    padding: 90px 24px;
    background: #FAFAF7;
  }
  .dms-wrap {
    max-width: 1080px;
    margin: 0 auto;
  }
  .dms-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
    align-items: center;
  }
  @media (min-width: 900px) {
    .dms-grid { grid-template-columns: 1fr 1fr; gap: 60px; }
  }
  .dms-text-eyebrow {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #3a9d5c;
    letter-spacing: 0.2em;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dms-text-eyebrow::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #7CE896;
  }
  .dms-text h2 {
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 500;
    letter-spacing: -0.025em;
    line-height: 1.15;
    margin-bottom: 16px;
  }
  .dms-text p {
    font-size: 15px;
    color: #666;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .dms-platform-list {
    display: flex; flex-direction: column;
    gap: 10px;
    margin-bottom: 28px;
  }
  .dms-platform-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 12px;
  }
  .dms-platform-icon {
    width: 28px; height: 28px;
    border-radius: 8px;
    background: #F2EFE5;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    color: #111;
  }
  .dms-platform-meta { flex: 1; }
  .dms-platform-name {
    font-size: 13px;
    font-weight: 500;
  }
  .dms-platform-tag {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #888;
    margin-top: 2px;
  }
  .dms-platform-status {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #3a9d5c;
    letter-spacing: 0.15em;
    display: flex; align-items: center; gap: 5px;
  }
  .dms-platform-status::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #7CE896;
  }
  .dms-platform-status.soon { color: #888; }
  .dms-platform-status.soon::before { background: #ccc; }

  /* Right side: simulated phone screen showing unified inbox */
  .dms-phone {
    background: #111;
    border-radius: 32px;
    padding: 16px 12px;
    max-width: 320px;
    margin: 0 auto;
    box-shadow: 0 30px 80px rgba(0,0,0,0.18);
  }
  .dms-phone-screen {
    background: #FAFAF7;
    border-radius: 22px;
    padding: 18px 16px;
    min-height: 460px;
  }
  .dms-phone-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 12px;
    border-bottom: 0.5px solid #E5E3DB;
    margin-bottom: 14px;
  }
  .dms-phone-orb {
    width: 22px; height: 22px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%, #5a5a5a 0%, #111 60%);
    animation: orb-breathe 3s ease-in-out infinite;
  }
  .dms-phone-title {
    font-size: 13px;
    font-weight: 500;
    flex: 1;
  }
  .dms-phone-subtitle {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
  }
  .dms-thread {
    padding: 12px 0;
    border-bottom: 0.5px solid #EEEBE0;
  }
  .dms-thread:last-child { border-bottom: none; }
  .dms-thread-head {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 6px;
  }
  .dms-thread-platform {
    width: 16px; height: 16px;
    border-radius: 4px;
    background: #F2EFE5;
    display: flex; align-items: center; justify-content: center;
  }
  .dms-thread-name {
    font-size: 12px;
    font-weight: 500;
    flex: 1;
  }
  .dms-thread-time {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
  }
  .dms-thread-message {
    font-size: 11px;
    color: #666;
    line-height: 1.45;
    margin-bottom: 4px;
  }
  .dms-thread-tag {
    display: inline-flex; align-items: center; gap: 4px;
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #3a9d5c;
    letter-spacing: 0.1em;
  }
  .dms-thread-tag::before {
    content: '';
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #7CE896;
  }

  /* ===================================
     SERVICE SECTIONS — reusable pattern with phone mockups
     Used by Signal/Calls, Echo/Content, Scout/Rivals, Pulse/Trends, Strategist/Reports
  =================================== */
  .svc-section {
    padding: 90px 24px;
    background: #FAFAF7;
  }
  .svc-section.alt {
    background: #F4F2EA;
  }
  .svc-wrap {
    max-width: 1080px;
    margin: 0 auto;
  }
  .svc-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
    align-items: center;
  }
  @media (min-width: 900px) {
    .svc-grid { grid-template-columns: 1fr 1fr; gap: 60px; }
    .svc-grid.reverse { direction: rtl; }
    .svc-grid.reverse > * { direction: ltr; }
  }
  .svc-text-eyebrow {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #3a9d5c;
    letter-spacing: 0.2em;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .svc-text-eyebrow::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #7CE896;
  }
  .svc-text-eyebrow.coming::before {
    background: #ccc;
  }
  .svc-text-eyebrow.coming {
    color: #888;
  }
  .svc-text h2 {
    font-size: clamp(26px, 3.8vw, 38px);
    font-weight: 500;
    letter-spacing: -0.025em;
    line-height: 1.15;
    margin-bottom: 16px;
  }
  .svc-text p {
    font-size: 15px;
    color: #666;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .svc-features {
    display: flex; flex-direction: column;
    gap: 10px;
    margin-bottom: 28px;
  }
  .svc-feature {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 16px;
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 12px;
  }
  .svc-feature-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #7CE896;
    margin-top: 6px;
    flex-shrink: 0;
  }
  .svc-feature-text {
    font-size: 13px;
    line-height: 1.5;
    color: #111;
  }
  .svc-feature-text strong {
    font-weight: 500;
  }
  .svc-cta-row {
    display: flex; gap: 12px; flex-wrap: wrap;
    margin-top: 4px;
  }
  .svc-cta-primary {
    background: #111;
    color: white;
    padding: 13px 22px;
    border-radius: 100px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.15s;
  }
  .svc-cta-primary:active { transform: scale(0.97); }
  .svc-cta-secondary {
    background: transparent;
    color: #111;
    padding: 13px 20px;
    border-radius: 100px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    border: 0.5px solid #E5E3DB;
    transition: border-color 0.15s;
  }
  .svc-cta-secondary:hover { border-color: #111; }

  /* Phone mockup with mini-canvas inside */
  .svc-phone-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .svc-phone {
    background: #111;
    border-radius: 36px;
    padding: 14px 12px 18px;
    width: 280px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08);
    position: relative;
  }
  .svc-phone::before {
    content: '';
    position: absolute;
    top: 8px; left: 50%;
    transform: translateX(-50%);
    width: 80px; height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 100px;
  }
  .svc-phone-screen {
    background: #FAFAF7;
    border-radius: 24px;
    padding: 22px 16px 18px;
    min-height: 480px;
    position: relative;
    overflow: hidden;
  }

  /* Mini-canvas: shared phone-frame card system */
  .mc-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 12px;
    margin-bottom: 12px;
    border-bottom: 0.5px solid #E5E3DB;
  }
  .mc-status-orb {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%, #5a5a5a 0%, #111 60%);
    animation: orb-breathe 3s ease-in-out infinite;
  }
  .mc-status-text {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.15em;
    flex: 1;
    margin-left: 8px;
  }
  .mc-status-time {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
  }

  .mc-card {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 8px;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .mc-card.show {
    opacity: 1;
    transform: translateY(0);
  }
  .mc-card-mono {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.12em;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .mc-card-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
  }
  .mc-card-dot.alive { background: #7CE896; }
  .mc-card-dot.urgent { background: #C84A3E; }
  .mc-card-dot.attn { background: #F0D98C; }
  .mc-card-dot.ink { background: #111; }
  .mc-card-title {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.35;
    margin-bottom: 3px;
    color: #111;
  }
  .mc-card-meta {
    font-size: 11px;
    color: #666;
    line-height: 1.4;
  }
  .mc-card-tag {
    display: inline-block;
    margin-top: 6px;
    padding: 2px 7px;
    border-radius: 100px;
    font-family: "SF Mono", monospace;
    font-size: 8px;
    letter-spacing: 0.1em;
  }
  .mc-card-tag.alive { background: rgba(124, 232, 150, 0.15); color: #3a9d5c; }
  .mc-card-tag.attn { background: #FFF9ED; color: #8a6a1e; }

  .mc-card.amber-card {
    background: #FFF9ED;
    border-color: #F0D98C;
  }
  .mc-card.dark-card {
    background: #111;
    color: white;
    border: none;
  }
  .mc-card.dark-card .mc-card-mono { color: rgba(255,255,255,0.5); }
  .mc-card.dark-card .mc-card-title { color: white; }
  .mc-card.dark-card .mc-card-meta { color: rgba(255,255,255,0.7); }

  /* Specific scene styles */
  .mc-call-anim {
    position: relative;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }
  .mc-call-orb {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%, #5a5a5a 0%, #111 60%);
    position: relative;
    animation: orb-breathe 3s ease-in-out infinite;
  }
  .mc-call-orb::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 0.5px solid rgba(200, 74, 62, 0.4);
    animation: pulse-ring 2s ease-in-out infinite;
  }

  .mc-post-img {
    height: 130px;
    background: linear-gradient(135deg, #C9A881 0%, #8B6F47 100%);
    border-radius: 10px;
    margin-bottom: 8px;
    position: relative;
    overflow: hidden;
  }
  .mc-post-img::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 25% 30%, rgba(255,255,255,0.15) 0%, transparent 40%),
      radial-gradient(circle at 75% 70%, rgba(0,0,0,0.2) 0%, transparent 50%);
  }
  .mc-post-cap {
    font-size: 11px;
    line-height: 1.4;
    color: #111;
    margin-bottom: 5px;
  }
  .mc-post-stats {
    display: flex;
    gap: 10px;
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
  }

  .mc-progress {
    height: 3px;
    background: #EEEBE0;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 8px;
  }
  .mc-progress-fill {
    height: 100%;
    background: #111;
    border-radius: 2px;
    width: 0;
    transition: width 0.5s ease;
  }
  .mc-progress.show .mc-progress-fill {
    width: 100%;
    transition: width 4s ease;
  }

  .mc-kpi-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 8px;
  }
  .mc-kpi-mini {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 10px;
    padding: 10px 12px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.4s ease, transform 0.4s ease;
  }
  .mc-kpi-mini.show {
    opacity: 1;
    transform: translateY(0);
  }
  .mc-kpi-label-mini {
    font-family: "SF Mono", monospace;
    font-size: 8px;
    color: #888;
    letter-spacing: 0.15em;
    margin-bottom: 3px;
  }
  .mc-kpi-num-mini {
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .mc-kpi-delta-mini {
    font-family: "SF Mono", monospace;
    font-size: 8px;
    color: #3a9d5c;
    margin-top: 2px;
  }

  .mc-trend-bar {
    height: 36px;
    display: flex;
    align-items: flex-end;
    gap: 3px;
    padding: 4px 0;
  }
  .mc-trend-bar-col {
    flex: 1;
    background: #E5E3DB;
    border-radius: 1.5px;
    transition: height 0.6s ease;
  }
  .mc-trend-bar-col.show {
    background: #111;
  }

  /* Hire Me section */
  .hire-me {
    padding: 100px 0 60px;
    text-align: center;
    position: relative;
  }
  .hire-me-wrap {
    background: #111;
    color: white;
    border-radius: 28px;
    padding: 72px 32px 64px;
    max-width: 760px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
  }
  .hire-me-wrap::before {
    content: '';
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);
    pointer-events: none;
  }
  .hire-me-orb {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #4a4a4a 0%, #222 60%);
    margin: 0 auto 32px;
    animation: float 4s ease-in-out infinite;
    position: relative;
    box-shadow: 0 0 40px rgba(255,255,255,0.04);
  }
  .hire-me-orb::after {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.12);
    animation: pulse-ring 3s ease-in-out infinite;
  }
  .hire-me-eyebrow {
    font-family: "SF Mono", monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.25em;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .hire-me-eyebrow::before,
  .hire-me-eyebrow::after {
    content: '';
    width: 24px;
    height: 0.5px;
    background: rgba(255,255,255,0.2);
  }
  .hire-me h2 {
    font-size: clamp(36px, 6vw, 56px);
    font-weight: 500;
    letter-spacing: -0.035em;
    line-height: 1.05;
    margin-bottom: 20px;
    color: white;
  }
  .hire-me-sub {
    font-size: clamp(15px, 2.2vw, 18px);
    color: rgba(255,255,255,0.6);
    max-width: 480px;
    margin: 0 auto 36px;
    line-height: 1.55;
  }
  .hire-me-cta-row {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .btn-hire-primary {
    background: white;
    color: #111;
    padding: 15px 30px;
    border-radius: 100px;
    font-size: 15px;
    font-weight: 500;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    transition: transform 0.15s;
  }
  .btn-hire-primary:active { transform: scale(0.97); }
  .btn-hire-secondary {
    background: transparent;
    color: white;
    padding: 15px 28px;
    border-radius: 100px;
    font-size: 15px;
    font-weight: 500;
    text-decoration: none;
    border: 0.5px solid rgba(255,255,255,0.25);
    transition: border-color 0.15s;
  }
  .btn-hire-secondary:hover { border-color: white; }
  .hire-me-trust {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .hire-me-trust-item {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.15em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .hire-me-trust-item::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255,255,255,0.3);
  }

  /* Section base */
  section {
    padding: 80px 0;
  }
  .section-label {
    font-family: "SF Mono", monospace;
    font-size: 11px;
    color: #888;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-label::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #111;
    display: inline-block;
  }
  .section-title {
    font-size: clamp(28px, 4.5vw, 40px);
    font-weight: 500;
    letter-spacing: -0.025em;
    line-height: 1.15;
    margin-bottom: 28px;
    color: #111;
    max-width: 640px;
  }
  .section-intro {
    font-size: clamp(15px, 2vw, 17px);
    color: #666;
    max-width: 560px;
    line-height: 1.6;
    margin-bottom: 48px;
  }

  /* "What I do" section */
  .what-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1px;
    background: #E5E3DB;
    border: 0.5px solid #E5E3DB;
    border-radius: 20px;
    overflow: hidden;
  }
  .what-item {
    background: #FAFAF7;
    padding: 28px 24px;
    transition: background 0.2s;
  }
  .what-item:hover {
    background: white;
  }
  .what-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .what-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #7CE896;
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }
  .what-label {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #3a9d5c;
    letter-spacing: 0.2em;
  }
  .what-title {
    font-size: 18px;
    font-weight: 500;
    color: #111;
    margin-bottom: 6px;
    letter-spacing: -0.015em;
  }
  .what-desc {
    font-size: 14px;
    color: #666;
    line-height: 1.55;
  }

  /* How it works section */
  .how-wrap {
    position: relative;
  }
  .how-steps {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .how-step {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 20px;
    padding: 24px;
    position: relative;
  }
  .how-num {
    font-family: "SF Mono", monospace;
    font-size: 11px;
    color: #999;
    letter-spacing: 0.2em;
    margin-bottom: 10px;
  }
  .how-title {
    font-size: 19px;
    font-weight: 500;
    color: #111;
    margin-bottom: 6px;
    letter-spacing: -0.015em;
  }
  .how-desc {
    font-size: 14px;
    color: #666;
    line-height: 1.55;
  }

  /* Meet the team v2 — agent rows on left, phone mockup on right.
     Auto-advances every 12s; click any agent to switch (auto resumes
     after 30s of no interaction). Driven by the engine in
     landing-script.ts. */
  .meet {
    padding: 90px 24px;
    background: #FAFAF7;
  }
  .meet-wrap {
    max-width: 1080px;
    margin: 0 auto;
  }
  .meet-eyebrow {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #888;
    letter-spacing: 0.2em;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .meet-eyebrow::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #111;
  }
  .meet h2 {
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 500;
    letter-spacing: -0.025em;
    line-height: 1.15;
    margin-bottom: 14px;
    max-width: 640px;
  }
  .meet-sub {
    font-size: 16px;
    color: #666;
    line-height: 1.6;
    max-width: 560px;
    margin-bottom: 48px;
  }
  .meet-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;
    align-items: start;
  }
  @media (min-width: 900px) {
    .meet-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 60px;
    }
  }
  .agent-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  @media (max-width: 899px) {
    .agent-list {
      flex-direction: row;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 0 12px;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
    }
    .agent-list::-webkit-scrollbar { display: none; }
  }
  .agent-row {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 14px;
    padding: 16px 18px;
    cursor: pointer;
    transition: background 0.25s ease, border-color 0.25s ease;
    position: relative;
    overflow: hidden;
    text-align: left;
    font-family: inherit;
    color: inherit;
  }
  @media (max-width: 899px) {
    .agent-row {
      flex-shrink: 0;
      min-width: 200px;
      scroll-snap-align: start;
      padding: 14px 16px;
    }
  }
  .agent-row:hover:not(.active) {
    border-color: #aaa;
    background: #FBFAF5;
  }
  .agent-row.active {
    background: #111;
    color: white;
    border-color: #111;
  }
  .agent-row.coming {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .agent-row-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .agent-row-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #7CE896;
    flex-shrink: 0;
  }
  .agent-row.coming .agent-row-dot {
    background: transparent;
    border: 1px solid #E5E3DB;
  }
  .agent-row.active .agent-row-dot {
    background: #7CE896;
    box-shadow: 0 0 0 3px rgba(124, 232, 150, 0.2);
  }
  .agent-row-name {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
    flex: 1;
  }
  .agent-row-soon {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    background: #FFF9ED;
    color: #8a6a1e;
    border: 0.5px solid #F0D98C;
    padding: 2px 7px;
    border-radius: 100px;
    letter-spacing: 0.1em;
  }
  .agent-row-desc {
    font-size: 13px;
    color: #666;
    line-height: 1.5;
    padding-left: 17px;
  }
  .agent-row.active .agent-row-desc {
    color: rgba(255, 255, 255, 0.7);
  }
  .agent-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: #7CE896;
    width: 0%;
    transition: width 0.1s linear;
  }
  .agent-row:not(.active) .agent-progress { display: none; }

  /* Phone mockup */
  .phone-wrap {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    position: sticky;
    top: 24px;
  }
  @media (max-width: 899px) {
    .phone-wrap { position: static; }
  }
  .phone {
    background: #111;
    border-radius: 36px;
    padding: 14px 12px 18px;
    width: 280px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08);
    position: relative;
  }
  .phone::before {
    content: '';
    position: absolute;
    top: 8px; left: 50%;
    transform: translateX(-50%);
    width: 80px; height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 100px;
  }
  .phone-screen {
    background: #FAFAF7;
    border-radius: 24px;
    padding: 22px 16px 18px;
    min-height: 480px;
    position: relative;
    overflow: hidden;
  }
  .phone-screen-inner {
    animation: meet-fade-in 0.4s ease;
  }
  @keyframes meet-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ps-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 12px;
    margin-bottom: 12px;
    border-bottom: 0.5px solid #E5E3DB;
  }
  .ps-orb {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%, #5a5a5a 0%, #111 60%);
    animation: orb-breathe 3s ease-in-out infinite;
  }
  .ps-text {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.15em;
    flex: 1;
    margin-left: 8px;
  }
  .ps-time {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
  }
  .pc-card {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 8px;
    opacity: 0;
    transform: translateY(10px);
    animation: pc-card-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  @keyframes pc-card-in {
    to { opacity: 1; transform: translateY(0); }
  }
  .pc-card.amber-card {
    background: #FFF9ED;
    border-color: #F0D98C;
  }
  .pc-card.dark-card {
    background: #111;
    color: white;
    border: none;
  }
  .pc-mono {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.12em;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .pc-card.dark-card .pc-mono { color: rgba(255,255,255,0.5); }
  .pc-mono-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
  }
  .pc-mono-dot.alive  { background: #7CE896; }
  .pc-mono-dot.urgent { background: #C84A3E; }
  .pc-mono-dot.attn   { background: #F0D98C; }
  .pc-mono-dot.ink    { background: #111; }
  .pc-card.amber-card .pc-mono { color: #8a6a1e; }
  .pc-title {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.35;
    margin-bottom: 3px;
    color: #111;
  }
  .pc-card.dark-card .pc-title { color: white; }
  .pc-meta {
    font-size: 11px;
    color: #666;
    line-height: 1.4;
  }
  .pc-card.dark-card .pc-meta { color: rgba(255,255,255,0.7); }
  .pc-tag {
    display: inline-block;
    margin-top: 6px;
    padding: 2px 7px;
    border-radius: 100px;
    font-family: "SF Mono", monospace;
    font-size: 8px;
    letter-spacing: 0.1em;
  }
  .pc-tag.alive { background: rgba(124, 232, 150, 0.15); color: #3a9d5c; }
  .pc-call-orb-wrap {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }
  .pc-call-orb {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%, #5a5a5a 0%, #111 60%);
    position: relative;
    animation: orb-breathe 3s ease-in-out infinite;
  }
  .pc-call-orb::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 0.5px solid rgba(200, 74, 62, 0.4);
    animation: pc-pulse-ring 2s ease-in-out infinite;
  }
  @keyframes pc-pulse-ring {
    0%, 100% { transform: scale(1);    opacity: 0.5; }
    50%      { transform: scale(1.18); opacity: 0; }
  }
  .pc-post-img {
    height: 130px;
    background: linear-gradient(135deg, #C9A881 0%, #8B6F47 100%);
    border-radius: 10px;
    margin-bottom: 8px;
    position: relative;
    overflow: hidden;
  }
  .pc-post-img::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 25% 30%, rgba(255,255,255,0.15) 0%, transparent 40%),
      radial-gradient(circle at 75% 70%, rgba(0,0,0,0.2) 0%, transparent 50%);
  }
  .pc-post-cap {
    font-size: 11px;
    line-height: 1.4;
    color: #111;
    margin-bottom: 5px;
  }
  .pc-post-stats {
    display: flex;
    gap: 10px;
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
  }
  .pc-progress {
    height: 3px;
    background: rgba(255,255,255,0.15);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 8px;
  }
  .pc-progress-fill {
    height: 100%;
    background: white;
    border-radius: 2px;
    width: 0%;
    animation: pc-progress-grow 6s ease-out forwards;
  }
  @keyframes pc-progress-grow {
    to { width: 100%; }
  }
  .pc-kpi-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 8px;
  }
  .pc-kpi {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 10px;
    padding: 10px 12px;
    opacity: 0;
    animation: pc-card-in 0.5s ease forwards;
  }
  .pc-kpi-label {
    font-family: "SF Mono", monospace;
    font-size: 8px;
    color: #888;
    letter-spacing: 0.15em;
    margin-bottom: 3px;
  }
  .pc-kpi-num {
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .pc-kpi-delta {
    font-family: "SF Mono", monospace;
    font-size: 8px;
    color: #3a9d5c;
    margin-top: 2px;
  }
  .pc-dm-platform {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 5px;
  }
  .pc-dm-icon {
    width: 16px; height: 16px;
    border-radius: 4px;
    background: #F2EFE5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #111;
    flex-shrink: 0;
  }
  .pc-dm-name {
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #888;
    letter-spacing: 0.1em;
  }
  .pc-dm-status {
    margin-left: auto;
    font-family: "SF Mono", monospace;
    font-size: 9px;
    color: #3a9d5c;
  }
  .meet-cta-row {
    text-align: center;
    margin-top: 56px;
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* Pricing */
  .pricing-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .price-card {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 20px;
    padding: 24px;
    position: relative;
  }
  .price-card.featured {
    border: 1.5px solid #111;
  }
  .price-badge {
    position: absolute;
    top: -9px;
    left: 20px;
    background: #111;
    color: white;
    padding: 4px 12px;
    border-radius: 100px;
    font-family: "SF Mono", monospace;
    font-size: 10px;
    letter-spacing: 0.15em;
  }
  .price-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
  }
  .price-name {
    font-size: 18px;
    font-weight: 500;
    color: #111;
  }
  .price-amt {
    font-size: 17px;
    color: #111;
  }
  .price-amt .per {
    font-size: 12px;
    color: #888;
  }
  .price-tagline {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #888;
    letter-spacing: 0.1em;
    margin-bottom: 16px;
  }
  .price-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 18px;
  }
  .price-list li {
    font-size: 13px;
    color: #444;
    line-height: 1.5;
    padding-left: 14px;
    position: relative;
  }
  .price-list li::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #888;
  }
  .price-cta {
    display: block;
    width: 100%;
    text-align: center;
    padding: 12px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    background: #F2EFE5;
    color: #111;
    transition: background 0.15s;
  }
  .price-cta:hover { background: #EAE6D8; }
  .price-card.featured .price-cta {
    background: #111;
    color: white;
  }
  .price-card.featured .price-cta:hover { background: #000; }
  .pricing-note {
    text-align: center;
    margin-top: 28px;
    font-family: "SF Mono", monospace;
    font-size: 11px;
    color: #999;
    letter-spacing: 0.05em;
  }

  /* FAQ */
  .faq-list {
    background: white;
    border: 0.5px solid #E5E3DB;
    border-radius: 20px;
    overflow: hidden;
  }
  .faq-item {
    border-bottom: 0.5px solid #EEEBE0;
  }
  .faq-item:last-child { border-bottom: none; }
  .faq-q {
    padding: 20px 24px;
    font-size: 15px;
    font-weight: 500;
    color: #111;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    transition: background 0.15s;
  }
  .faq-q:hover { background: #F8F6EF; }
  .faq-toggle {
    font-family: "SF Mono", monospace;
    font-size: 18px;
    color: #999;
    transition: transform 0.2s;
    flex-shrink: 0;
  }
  .faq-item.open .faq-toggle { transform: rotate(45deg); }
  .faq-a {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.25s ease;
  }
  .faq-item.open .faq-a { max-height: 400px; }
  .faq-a-inner {
    padding: 0 24px 22px;
    font-size: 14px;
    color: #666;
    line-height: 1.65;
  }

  /* Footer */
  footer {
    border-top: 0.5px solid #E5E3DB;
    padding: 32px 0 40px;
  }
  .footer-inner {
    display: flex;
    flex-direction: column;
    gap: 18px;
    align-items: center;
    text-align: center;
  }
  .footer-logo {
    font-family: "SF Mono", monospace;
    font-size: 13px;
    color: #111;
    letter-spacing: 0.05em;
  }
  .footer-links {
    display: flex;
    gap: 22px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .footer-links a {
    font-size: 12px;
    color: #888;
    text-decoration: none;
  }
  .footer-links a:hover { color: #111; }
  .footer-copy {
    font-family: "SF Mono", monospace;
    font-size: 10px;
    color: #999;
    letter-spacing: 0.08em;
  }

  /* App store badge */
  .app-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #111;
    color: white;
    padding: 12px 18px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    transition: transform 0.15s;
  }
  .app-badge:active { transform: scale(0.97); }
  .app-badge-icon {
    width: 18px; height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Desktop enhancements */
  @media (min-width: 820px) {
    .nav-inner { padding: 18px 32px; }
    .hero { padding: 140px 0 100px; }
    .hero-orb { width: 140px; height: 140px; }
    section { padding: 100px 0; }
    .what-grid {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .how-steps {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .pricing-grid {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
  }
  @media (min-width: 1100px) {
    .pricing-grid {
      grid-template-columns: 1fr 1fr 1fr 1fr;
    }
    .price-card.featured {
      transform: translateY(-8px);
    }
    .footer-inner {
      flex-direction: row;
      justify-content: space-between;
      text-align: left;
    }
    .hire-me-wrap {
      padding: 88px 48px 80px;
    }
  }

  @media (max-width: 600px) {
    .hire-me {
      padding: 60px 16px 40px;
    }
    .hire-me-wrap {
      padding: 56px 22px 48px;
      border-radius: 22px;
    }
    .hire-me-eyebrow::before,
    .hire-me-eyebrow::after {
      display: none;
    }
  }

  /* Scroll-in animation */
  .reveal {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }
`;

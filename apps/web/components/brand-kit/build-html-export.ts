// Builds a one-file HTML brand book the user can download. Every SVG and
// every style is inlined; the only external fetch is Google Fonts, which
// degrades to system-font fallbacks when offline.

type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  surface: string;
  bg: string;
  rationale?: string;
};
type Typography = {
  headingFont: string;
  bodyFont: string;
  weights: string[];
  rationale?: string;
};
type LogoTemplates = {
  primary: string;
  mark: string;
  monochrome: string;
  lightOnDark: string;
  wordmark: string;
};
type VoiceTone = {
  voiceTone?: string[];
  brandValues?: string[];
  audienceSegments?: { name: string; description: string }[];
  contentPillars?: string[];
  doNotDoList?: string[];
};

function applyPalette(svg: string, palette: Palette): string {
  return svg
    .replace(/\{\{primary\}\}/g, palette.primary)
    .replace(/\{\{secondary\}\}/g, palette.secondary)
    .replace(/\{\{accent\}\}/g, palette.accent)
    .replace(/\{\{ink\}\}/g, palette.ink)
    .replace(/\{\{surface\}\}/g, palette.surface)
    .replace(/\{\{bg\}\}/g, palette.bg);
}
function cleanSvg(svg: string): string {
  return svg.replace(/^\s*<\?xml[^?]*\?>\s*/i, "").trim();
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildBrandKitHtml(args: {
  businessName: string;
  version: number;
  generatedAt: Date | string;
  palette: Palette;
  typography: Typography;
  logos: LogoTemplates;
  graphics: string[];
  imageStyle: string;
  logoConcept: string;
  voiceTone: VoiceTone | null;
}): string {
  const { palette, typography, logos, graphics, voiceTone } = args;
  const headingFontStack = `"${typography.headingFont}", -apple-system, system-ui, sans-serif`;
  const bodyFontStack = `"${typography.bodyFont}", -apple-system, system-ui, sans-serif`;

  const renderedLogos = Object.fromEntries(
    Object.entries(logos).map(([k, v]) => [k, cleanSvg(applyPalette(v, palette))]),
  ) as Record<keyof LogoTemplates, string>;
  const renderedGraphics = graphics.map((g) =>
    cleanSvg(applyPalette(g, palette)),
  );

  const swatch = (label: string, role: string, hex: string) => `
    <div class="swatch">
      <div class="swatch-color" style="background:${hex}"></div>
      <div class="swatch-info">
        <div class="swatch-name">${escapeHtml(label)}</div>
        <div class="swatch-role">${escapeHtml(role)}</div>
        <div class="swatch-hex">${escapeHtml(hex)}</div>
      </div>
    </div>`;

  const logoCard = (
    label: string,
    desc: string,
    svg: string,
    dark = false,
    aspect = "1/1",
  ) => `
    <div class="logo-card">
      <div class="logo-canvas" style="background:${dark ? palette.ink : palette.surface};aspect-ratio:${aspect};">
        <div class="logo-frame">${svg}</div>
      </div>
      <div class="logo-meta">
        <div class="logo-name">${escapeHtml(label)}</div>
        <div class="logo-desc">${escapeHtml(desc)}</div>
      </div>
    </div>`;

  const voiceList = (label: string, items: string[] | undefined, tone?: "dont") =>
    items && items.length > 0
      ? `<div class="voice-card">
           <div class="voice-label ${tone === "dont" ? "voice-label-dont" : ""}">${escapeHtml(label.toUpperCase())}</div>
           <ul>${items.map((i) => `<li>· ${escapeHtml(i)}</li>`).join("")}</ul>
         </div>`
      : "";

  const audience =
    voiceTone?.audienceSegments && voiceTone.audienceSegments.length > 0
      ? `<div class="audience">
           <div class="voice-label">AUDIENCE</div>
           ${voiceTone.audienceSegments
             .map(
               (s) => `
             <div class="audience-row">
               <div class="audience-name">${escapeHtml(s.name)}</div>
               <div class="audience-desc">${escapeHtml(s.description)}</div>
             </div>`,
             )
             .join("")}
         </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(args.businessName)} — Brand Kit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(typography.headingFont).replace(/%20/g, "+")}:wght@400;500;600&family=${encodeURIComponent(typography.bodyFont).replace(/%20/g, "+")}:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${bodyFontStack};
    background: #FAFAF7;
    color: ${palette.ink};
    line-height: 1.5;
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    padding: 60px 24px 80px;
  }
  .wrap { max-width: 1080px; margin: 0 auto; }
  h1, h2, h3 { font-family: ${headingFontStack}; font-weight: 500; letter-spacing: -0.02em; }
  .hero { text-align: center; padding: 60px 0 40px; border-bottom: 0.5px solid #E5E3DB; margin-bottom: 60px; }
  .hero-eyebrow { font-size: 11px; letter-spacing: 0.2em; color: ${palette.accent}; text-transform: uppercase; font-weight: 500; margin-bottom: 16px; }
  .hero h1 { font-size: clamp(40px, 6vw, 64px); line-height: 1.05; margin-bottom: 16px; }
  .hero-mark { width: 120px; height: 120px; margin: 0 auto 32px; }
  .hero-mark svg { width: 100%; height: 100%; }
  .hero-sub { font-size: 16px; color: #666; max-width: 540px; margin: 0 auto; line-height: 1.6; }
  section { padding: 56px 0; border-top: 0.5px solid #E5E3DB; }
  section:first-of-type { border-top: none; padding-top: 0; }
  .section-num { font-family: monospace; font-size: 11px; letter-spacing: 0.1em; color: #888; margin-bottom: 8px; }
  .section-title { font-size: clamp(24px, 3vw, 32px); margin-bottom: 8px; }
  .section-sub { font-size: 15px; color: #666; max-width: 560px; line-height: 1.55; margin-bottom: 32px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
  @media (max-width: 768px) {
    .grid-2, .grid-3 { grid-template-columns: 1fr; }
    .grid-6 { grid-template-columns: repeat(2, 1fr); }
  }
  .logo-card { background: white; border: 0.5px solid #E5E3DB; border-radius: 16px; overflow: hidden; }
  .logo-canvas { display: flex; align-items: center; justify-content: center; padding: 32px; }
  .logo-frame { width: 60%; aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; }
  .logo-frame svg { max-width: 100%; max-height: 100%; }
  .logo-meta { padding: 16px 20px; border-top: 0.5px solid #EEEBE0; }
  .logo-name { font-size: 13px; font-weight: 500; }
  .logo-desc { font-size: 12px; color: #888; margin-top: 2px; }
  .swatch { background: white; border: 0.5px solid #E5E3DB; border-radius: 12px; overflow: hidden; }
  .swatch-color { height: 80px; }
  .swatch-info { padding: 12px 14px; }
  .swatch-name { font-size: 12px; font-weight: 500; }
  .swatch-role { font-size: 10px; color: #888; margin-bottom: 6px; }
  .swatch-hex { font-family: monospace; font-size: 11px; color: #444; }
  .type-card { background: white; border: 0.5px solid #E5E3DB; border-radius: 16px; padding: 24px; }
  .type-label { font-size: 10px; letter-spacing: 0.1em; color: #888; margin-bottom: 12px; text-transform: uppercase; }
  .type-display-h { font-family: ${headingFontStack}; font-size: 36px; font-weight: 500; letter-spacing: -0.025em; line-height: 1; }
  .type-display-b { font-family: ${bodyFontStack}; font-size: 16px; line-height: 1.5; }
  .type-name { font-family: monospace; font-size: 11px; color: #888; margin-top: 12px; }
  .graphic-card { background: white; border: 0.5px solid #E5E3DB; border-radius: 16px; overflow: hidden; }
  .graphic-frame { aspect-ratio: 1200/630; display: flex; align-items: center; justify-content: center; }
  .graphic-frame svg { width: 100%; height: 100%; display: block; }
  .voice-card { background: white; border: 0.5px solid #E5E3DB; border-radius: 12px; padding: 18px 20px; }
  .voice-label { font-family: monospace; font-size: 10px; letter-spacing: 0.15em; color: #888; margin-bottom: 12px; }
  .voice-label-dont { color: #C84A3E; }
  .voice-card ul { list-style: none; }
  .voice-card li { font-size: 13px; line-height: 1.6; color: #444; margin-bottom: 4px; }
  .audience { background: white; border: 0.5px solid #E5E3DB; border-radius: 12px; padding: 24px; margin-top: 16px; }
  .audience-row { margin-bottom: 16px; }
  .audience-row:last-child { margin-bottom: 0; }
  .audience-name { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
  .audience-desc { font-size: 13px; color: #666; line-height: 1.55; }
  .image-style { background: white; border: 0.5px solid #E5E3DB; border-radius: 12px; padding: 24px; font-size: 14px; color: #444; line-height: 1.6; }
  footer { margin-top: 64px; padding-top: 32px; border-top: 0.5px solid #E5E3DB; text-align: center; font-family: monospace; font-size: 11px; color: #888; }
</style>
</head>
<body>
<div class="wrap">

  <header class="hero">
    <div class="hero-eyebrow">brand kit · v${args.version}</div>
    <div class="hero-mark">${renderedLogos.mark}</div>
    <h1>${escapeHtml(args.businessName)}.</h1>
    <p class="hero-sub">${escapeHtml(args.logoConcept)}</p>
  </header>

  <section>
    <div class="section-num">01 · LOGO</div>
    <h2 class="section-title">the mark.</h2>
    <p class="section-sub">five hand-tuned svg variants with palette tokens. edit the palette to re-render every variant in your brand book panel.</p>
    <div class="grid-2">
      ${logoCard("primary mark", "the hero version", renderedLogos.primary)}
      ${logoCard("icon only", "no text · favicon-ready", renderedLogos.mark)}
      ${logoCard("monochrome", "single color · for embossing", renderedLogos.monochrome)}
      ${logoCard("on dark", "for dark surfaces", renderedLogos.lightOnDark, true)}
    </div>
    <div style="margin-top:16px;">
      ${logoCard("horizontal lockup", "icon + name", renderedLogos.wordmark, false, "2/1")}
    </div>
  </section>

  <section>
    <div class="section-num">02 · COLORS</div>
    <h2 class="section-title">the palette.</h2>
    <p class="section-sub">${escapeHtml(palette.rationale ?? "the brand's color system. each role earns its place.")}</p>
    <div class="grid-6">
      ${swatch("primary", "ctas, key ui", palette.primary)}
      ${swatch("secondary", "supporting", palette.secondary)}
      ${swatch("accent", "callouts", palette.accent)}
      ${swatch("ink", "all text", palette.ink)}
      ${swatch("surface", "card fills", palette.surface)}
      ${swatch("background", "page bg", palette.bg)}
    </div>
  </section>

  <section>
    <div class="section-num">03 · TYPOGRAPHY</div>
    <h2 class="section-title">the type system.</h2>
    <p class="section-sub">${escapeHtml(typography.rationale ?? "two faces. heading + body. weights kept restrained.")}</p>
    <div class="grid-2">
      <div class="type-card">
        <div class="type-label">HEADING</div>
        <div class="type-display-h">${escapeHtml(args.businessName)}.</div>
        <div class="type-name">${escapeHtml(typography.headingFont)}</div>
      </div>
      <div class="type-card">
        <div class="type-label">BODY</div>
        <div class="type-display-b">8,400 people saw them. three customers messaged you — i handled them.</div>
        <div class="type-name">${escapeHtml(typography.bodyFont)}</div>
      </div>
    </div>
    <div style="margin-top:16px;font-size:12px;color:#888;">weights: ${escapeHtml(typography.weights.join(" / "))}</div>
  </section>

  ${
    renderedGraphics.length > 0
      ? `<section>
    <div class="section-num">04 · GRAPHICS</div>
    <h2 class="section-title">brand cover graphics.</h2>
    <p class="section-sub">three abstract svg compositions for social headers, presentation slides, and email covers.</p>
    <div class="grid-3">
      ${renderedGraphics
        .map(
          (g, i) =>
            `<div class="graphic-card"><div class="graphic-frame" style="background:${palette.surface};">${g}</div><div style="padding:12px 20px;font-size:12px;color:#888;">graphic ${i + 1}</div></div>`,
        )
        .join("")}
    </div>
  </section>`
      : ""
  }

  <section>
    <div class="section-num">05 · IMAGE STYLE</div>
    <h2 class="section-title">how echo draws photos.</h2>
    <p class="section-sub">this prompt prefix is prepended to every photo generation downstream.</p>
    <div class="image-style">${escapeHtml(args.imageStyle)}</div>
  </section>

  ${
    voiceTone &&
    ((voiceTone.voiceTone?.length ?? 0) > 0 ||
      (voiceTone.brandValues?.length ?? 0) > 0 ||
      (voiceTone.contentPillars?.length ?? 0) > 0 ||
      (voiceTone.doNotDoList?.length ?? 0) > 0)
      ? `<section>
    <div class="section-num">06 · VOICE</div>
    <h2 class="section-title">how the brand sounds.</h2>
    <p class="section-sub">frozen from the strategist run.</p>
    <div class="grid-2">
      ${voiceList("voice tone", voiceTone.voiceTone)}
      ${voiceList("brand values", voiceTone.brandValues)}
      ${voiceList("content pillars", voiceTone.contentPillars)}
      ${voiceList("do not do", voiceTone.doNotDoList, "dont")}
    </div>
    ${audience}
  </section>`
      : ""
  }

  <footer>
    ${escapeHtml(args.businessName.toUpperCase())} · BRAND KIT v${args.version} ·
    ${new Date(args.generatedAt)
      .toLocaleDateString("en-US", { month: "short", year: "numeric" })
      .toUpperCase()}<br>
    GENERATED BY ADFI · ADFI.CA
  </footer>

</div>
</body>
</html>`;
}

"use client";
import { useMemo, useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";

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

const PALETTE_KEYS: { key: keyof Palette; label: string; role: string }[] = [
  { key: "primary", label: "primary", role: "ctas, key ui" },
  { key: "secondary", label: "secondary", role: "supporting buttons, links" },
  { key: "accent", label: "accent", role: "status dots, callouts" },
  { key: "ink", label: "ink", role: "all text" },
  { key: "surface", label: "surface", role: "card fills" },
  { key: "bg", label: "background", role: "page bg" },
];

const LOGO_DEFS: { key: keyof LogoTemplates; label: string; desc: string; aspect: string; dark?: boolean }[] = [
  { key: "primary", label: "primary mark", desc: "the hero version", aspect: "1/1" },
  { key: "mark", label: "icon only", desc: "no text · favicon-ready", aspect: "1/1" },
  { key: "monochrome", label: "monochrome", desc: "single color · for embossing", aspect: "1/1" },
  { key: "lightOnDark", label: "on dark", desc: "for dark surfaces", aspect: "1/1", dark: true },
  { key: "wordmark", label: "horizontal lockup", desc: "icon + name", aspect: "2/1" },
];

// Replace {{primary}} / {{accent}} / etc. with the user's current palette.
// Same logic as the server, kept here so live edits update immediately.
function applyPalette(svg: string, palette: Palette): string {
  return svg
    .replace(/\{\{primary\}\}/g, palette.primary)
    .replace(/\{\{secondary\}\}/g, palette.secondary)
    .replace(/\{\{accent\}\}/g, palette.accent)
    .replace(/\{\{ink\}\}/g, palette.ink)
    .replace(/\{\{surface\}\}/g, palette.surface)
    .replace(/\{\{bg\}\}/g, palette.bg);
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function downloadSvg(filename: string, svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadJson(filename: string, json: unknown) {
  const blob = new Blob([JSON.stringify(json, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BrandKitPanel() {
  const utils = trpc.useUtils();
  const query = trpc.brandKit.getMine.useQuery();
  const generate = trpc.brandKit.generate.useMutation({
    onSuccess: () => utils.brandKit.getMine.invalidate(),
  });
  const updatePalette = trpc.brandKit.updatePalette.useMutation({
    onSuccess: () => utils.brandKit.getMine.invalidate(),
  });
  const updateTypography = trpc.brandKit.updateTypography.useMutation({
    onSuccess: () => utils.brandKit.getMine.invalidate(),
  });
  const updateImageStyle = trpc.brandKit.updateImageStyle.useMutation({
    onSuccess: () => utils.brandKit.getMine.invalidate(),
  });

  const [hint, setHint] = useState("");
  const [editingStyle, setEditingStyle] = useState(false);
  const [styleDraft, setStyleDraft] = useState("");

  if (query.isLoading) {
    return <p className="text-sm text-ink3">one second</p>;
  }
  if (!query.data) return null;

  const { kit, plan, quota, generationCostCents, monthlyCap } = query.data;
  const remainingLine =
    quota.remaining > 0
      ? `${quota.remaining}/${monthlyCap} regenerations left this month · ${plan.toLowerCase()} plan · ~$${(generationCostCents / 100).toFixed(2)} per regenerate`
      : `you've used all ${monthlyCap} regenerations this month — wait for the window to refresh or upgrade`;

  // Empty state — kit exists but no logo templates yet (legacy raster row).
  const hasLogos =
    kit && kit.logoTemplates && Object.keys(kit.logoTemplates).length > 0;

  if (!kit || !hasLogos) {
    return (
      <Card>
        <div className="text-md font-medium mb-sm">no brand kit yet</div>
        <p className="text-sm text-ink3 leading-relaxed mb-md">
          generate a palette, typography pairing, five hand-tuned svg logo
          variants, and three brand cover graphics — all crafted to your
          voice. every asset is editable. echo will use this look on every
          image it draws afterward.
        </p>
        <div className="text-xs text-ink4 mb-md">{remainingLine}</div>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="optional hint — e.g. 'editorial newsroom feel', 'soft beige + gold'"
          disabled={generate.isPending}
          className="w-full px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink mb-md"
        />
        <button
          type="button"
          onClick={() =>
            generate.mutate(
              hint.trim() ? { refinementHint: hint.trim() } : {},
            )
          }
          disabled={generate.isPending || quota.remaining === 0}
          className="bg-ink text-white text-xs font-medium px-md py-[8px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
        >
          {generate.isPending ? "drawing your kit..." : "generate brand kit →"}
        </button>
        {generate.error ? (
          <p className="text-sm text-urgent mt-md">{generate.error.message}</p>
        ) : null}
      </Card>
    );
  }

  const palette = kit.palette as unknown as Palette;
  const typography = kit.typography as unknown as Typography;
  const logos = kit.logoTemplates as unknown as LogoTemplates;
  const graphics = (kit.coverSamples as unknown as string[]) ?? [];

  return (
    <BrandBook
      kit={{
        version: kit.version,
        generatedAt: kit.generatedAt,
        palette,
        typography,
        logos,
        graphics,
        imageStyle: kit.imageStyle,
        logoConcept: kit.logoConcept,
        voiceTone: kit.voiceTone as VoiceTone | null,
      }}
      remainingLine={remainingLine}
      hint={hint}
      onHintChange={setHint}
      generate={generate}
      onUpdatePalette={(patch) => updatePalette.mutate(patch)}
      onUpdateTypography={(patch) => updateTypography.mutate(patch)}
      editingStyle={editingStyle}
      styleDraft={styleDraft}
      onEditStyleStart={() => {
        setStyleDraft(kit.imageStyle);
        setEditingStyle(true);
      }}
      onEditStyleCancel={() => setEditingStyle(false)}
      onEditStyleChange={setStyleDraft}
      onEditStyleSave={() => {
        if (styleDraft.trim().length < 20) return;
        updateImageStyle.mutate(
          { imageStyle: styleDraft.trim() },
          { onSuccess: () => setEditingStyle(false) },
        );
      }}
      saveStylePending={updateImageStyle.isPending}
      saveStyleError={updateImageStyle.error?.message ?? null}
    />
  );
}

// =============================================================
// Brand book — the visual layout matching the reference design.
// =============================================================

type BookProps = {
  kit: {
    version: number;
    generatedAt: Date | string;
    palette: Palette;
    typography: Typography;
    logos: LogoTemplates;
    graphics: string[];
    imageStyle: string;
    logoConcept: string;
    voiceTone: VoiceTone | null;
  };
  remainingLine: string;
  hint: string;
  onHintChange: (v: string) => void;
  generate: ReturnType<typeof trpc.brandKit.generate.useMutation>;
  onUpdatePalette: (patch: Partial<Palette>) => void;
  onUpdateTypography: (patch: Partial<Typography>) => void;
  editingStyle: boolean;
  styleDraft: string;
  onEditStyleStart: () => void;
  onEditStyleCancel: () => void;
  onEditStyleChange: (v: string) => void;
  onEditStyleSave: () => void;
  saveStylePending: boolean;
  saveStyleError: string | null;
};

function BrandBook(p: BookProps) {
  const { kit } = p;
  const palette = kit.palette;
  return (
    <div className="flex flex-col gap-2xl">
      <ControlsBar {...p} />
      <LogoSection logos={kit.logos} palette={palette} concept={kit.logoConcept} />
      <SizeShowcase logo={kit.logos.mark} palette={palette} />
      <ColorSection palette={palette} onUpdate={p.onUpdatePalette} />
      <TypographySection
        typography={kit.typography}
        onUpdate={p.onUpdateTypography}
      />
      <GraphicsSection graphics={kit.graphics} palette={palette} />
      <UsageSection logo={kit.logos.mark} palette={palette} />
      <MockupsSection
        logo={kit.logos.mark}
        wordmark={kit.logos.wordmark}
        palette={palette}
      />
      <VoiceSection voice={kit.voiceTone} />
      <ImageStyleSection
        imageStyle={kit.imageStyle}
        editing={p.editingStyle}
        draft={p.styleDraft}
        onStart={p.onEditStyleStart}
        onCancel={p.onEditStyleCancel}
        onChange={p.onEditStyleChange}
        onSave={p.onEditStyleSave}
        pending={p.saveStylePending}
        error={p.saveStyleError}
      />
      <AssetsSection logos={kit.logos} palette={palette} typography={kit.typography} />
    </div>
  );
}

function SizeShowcase({ logo, palette }: { logo: string; palette: Palette }) {
  const rendered = applyPalette(logo, palette);
  const uri = svgDataUri(rendered);
  const sizes = [
    { px: 16, label: "16PX · favicon" },
    { px: 32, label: "32PX · ui" },
    { px: 64, label: "64PX · app icon" },
    { px: 120, label: "120PX · hero" },
  ];
  return (
    <Card>
      <div className="text-[11px] text-ink4 mb-md tracking-[0.1em]">
        SCALES
      </div>
      <div className="flex items-end justify-around flex-wrap gap-lg py-md">
        {sizes.map((s) => (
          <div key={s.px} className="flex flex-col items-center gap-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uri}
              alt=""
              style={{ width: s.px, height: s.px }}
              className="object-contain"
            />
            <div className="font-mono text-[10px] text-ink4">{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function UsageSection({
  logo,
  palette,
}: {
  logo: string;
  palette: Palette;
}) {
  const rendered = applyPalette(logo, palette);
  const uri = svgDataUri(rendered);
  return (
    <div>
      <SectionHeader
        num="07 · USAGE"
        title="how to use the mark."
        sub="give the logo room. keep it on-palette. these rules protect it."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <UsageCard
          tone="do"
          tip="give the mark room. minimum padding equal to half its diameter on every side."
          surface={palette.bg}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uri} alt="" className="w-[80px] h-[80px] object-contain" />
        </UsageCard>
        <UsageCard
          tone="dont"
          tip="don't crowd the mark against text. keep at least 14px of breathing room in any lockup."
          surface={palette.bg}
        >
          <div className="flex items-center gap-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uri} alt="" className="w-[60px] h-[60px] object-contain" />
            <span
              className="text-2xl font-medium tracking-tight"
              style={{ color: palette.ink }}
            >
              brand
            </span>
          </div>
        </UsageCard>
        <UsageCard
          tone="do"
          tip="use the on-dark variant when placing the mark on ink. provides the contrast it needs."
          surface={palette.ink}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uri} alt="" className="w-[80px] h-[80px] object-contain opacity-90" />
        </UsageCard>
        <UsageCard
          tone="dont"
          tip="don't recolor the mark outside the palette. brand colors stay scarce — that's what makes them powerful."
          surface={palette.bg}
        >
          <div
            className="w-[80px] h-[80px] rounded-md"
            style={{
              background: "linear-gradient(135deg, #ff6b6b 0%, #d32d2d 100%)",
            }}
          />
        </UsageCard>
      </div>
    </div>
  );
}

function UsageCard({
  tone,
  tip,
  surface,
  children,
}: {
  tone: "do" | "dont";
  tip: string;
  surface: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border-hairline border-border rounded-[16px] overflow-hidden">
      <div
        className="h-[180px] flex items-center justify-center p-lg"
        style={{ background: surface }}
      >
        {children}
      </div>
      <div className="px-lg py-md">
        <div
          className={`font-mono text-[10px] tracking-[0.15em] mb-xs ${
            tone === "do" ? "text-aliveDark" : "text-urgent"
          }`}
        >
          {tone === "do" ? "✓ DO" : "✗ DON'T"}
        </div>
        <p className="text-sm text-ink2 leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

function MockupsSection({
  logo,
  wordmark,
  palette,
}: {
  logo: string;
  wordmark: string;
  palette: Palette;
}) {
  const logoUri = svgDataUri(applyPalette(logo, palette));
  const wordmarkUri = svgDataUri(applyPalette(wordmark, palette));
  return (
    <div>
      <SectionHeader
        num="08 · IN CONTEXT"
        title="real-world applications."
        sub="how the mark looks where it actually lives — favicon, social avatar, business card."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {/* Favicon mockup */}
        <div className="bg-white border-hairline border-border rounded-[16px] overflow-hidden">
          <div
            className="h-[180px] flex items-center justify-center"
            style={{ background: palette.surface }}
          >
            <div
              className="bg-white rounded-md shadow-sm border-hairline border-border p-sm flex items-center gap-sm"
              style={{ minWidth: 240 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUri}
                alt=""
                className="w-[16px] h-[16px] object-contain shrink-0"
              />
              <span
                className="text-xs truncate"
                style={{ color: palette.ink, fontFamily: "system-ui" }}
              >
                yourbrand.com
              </span>
            </div>
          </div>
          <div className="px-lg py-md">
            <div className="text-xs font-medium">favicon · 16px</div>
            <div className="text-[11px] text-ink4">browser tab</div>
          </div>
        </div>

        {/* Social avatar mockup */}
        <div className="bg-white border-hairline border-border rounded-[16px] overflow-hidden">
          <div
            className="h-[180px] flex items-center justify-center"
            style={{ background: palette.surface }}
          >
            <div
              className="rounded-full overflow-hidden flex items-center justify-center"
              style={{
                width: 96,
                height: 96,
                background: palette.ink,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUri}
                alt=""
                className="w-[60%] h-[60%] object-contain"
                style={{ filter: "invert(1) brightness(2)" }}
              />
            </div>
          </div>
          <div className="px-lg py-md">
            <div className="text-xs font-medium">social avatar</div>
            <div className="text-[11px] text-ink4">instagram, linkedin, x</div>
          </div>
        </div>

        {/* Business card mockup */}
        <div className="bg-white border-hairline border-border rounded-[16px] overflow-hidden">
          <div
            className="h-[180px] flex items-center justify-center p-md"
            style={{ background: palette.surface }}
          >
            <div
              className="rounded-md p-md flex items-center justify-center"
              style={{
                background: palette.bg,
                aspectRatio: "85/54",
                width: "85%",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={wordmarkUri}
                alt=""
                className="max-w-[85%] max-h-[60%] object-contain"
              />
            </div>
          </div>
          <div className="px-lg py-md">
            <div className="text-xs font-medium">business card</div>
            <div className="text-[11px] text-ink4">85x54mm · landscape</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  num,
  title,
  sub,
}: {
  num: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-lg">
      <div className="font-mono text-[11px] text-ink4 tracking-[0.1em] mb-xs">
        {num}
      </div>
      <h2 className="text-2xl font-medium tracking-tight mb-xs">{title}</h2>
      <p className="text-sm text-ink3 max-w-[560px] leading-relaxed">{sub}</p>
    </div>
  );
}

function ControlsBar(p: BookProps) {
  return (
    <Card>
      <div className="flex items-baseline justify-between flex-wrap gap-sm mb-md">
        <div>
          <div className="text-md font-medium">version {p.kit.version}</div>
          <div className="text-xs text-ink4">
            generated{" "}
            {new Date(p.kit.generatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
        <div className="text-xs text-ink4 max-w-[320px] text-right">
          {p.remainingLine}
        </div>
      </div>
      <div className="flex flex-wrap gap-sm">
        <input
          type="text"
          value={p.hint}
          onChange={(e) => p.onHintChange(e.target.value)}
          placeholder="hint for regenerate (e.g. 'bolder accent', 'less corporate')"
          disabled={p.generate.isPending}
          className="flex-1 min-w-[240px] px-md py-[8px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={() =>
            p.generate.mutate(
              p.hint.trim() ? { refinementHint: p.hint.trim() } : {},
            )
          }
          disabled={p.generate.isPending}
          className="bg-ink text-white text-xs font-medium px-md py-[8px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
        >
          {p.generate.isPending ? "drawing..." : "regenerate →"}
        </button>
      </div>
      {p.generate.error ? (
        <p className="text-sm text-urgent mt-sm">{p.generate.error.message}</p>
      ) : null}
    </Card>
  );
}

function LogoSection({
  logos,
  palette,
  concept,
}: {
  logos: LogoTemplates;
  palette: Palette;
  concept: string;
}) {
  return (
    <div>
      <SectionHeader
        num="01 · LOGO"
        title="the mark."
        sub={concept || "your logo system, generated as svg so it scales infinitely and updates live when you change colors."}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
        {LOGO_DEFS.map((def) => (
          <LogoCard
            key={def.key}
            label={def.label}
            desc={def.desc}
            svg={logos[def.key]}
            palette={palette}
            aspect={def.aspect}
            dark={def.dark}
          />
        ))}
      </div>
    </div>
  );
}

function LogoCard({
  label,
  desc,
  svg,
  palette,
  aspect,
  dark,
}: {
  label: string;
  desc: string;
  svg: string;
  palette: Palette;
  aspect: string;
  dark?: boolean;
}) {
  const rendered = applyPalette(svg, palette);
  return (
    <div className="bg-white border-hairline border-border rounded-[16px] overflow-hidden">
      <div
        className="flex items-center justify-center p-xl"
        style={{
          aspectRatio: aspect,
          background: dark ? palette.ink : palette.bg,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgDataUri(rendered)}
          alt={label}
          className="max-w-[60%] max-h-[80%] object-contain"
        />
      </div>
      <div className="px-lg py-md flex items-center justify-between gap-sm">
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-ink4 truncate">{desc}</div>
        </div>
        <button
          type="button"
          onClick={() =>
            downloadSvg(`logo-${label.replace(/\s+/g, "-")}.svg`, rendered)
          }
          className="font-mono text-[11px] text-ink3 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors shrink-0"
        >
          ↓ svg
        </button>
      </div>
    </div>
  );
}

function ColorSection({
  palette,
  onUpdate,
}: {
  palette: Palette;
  onUpdate: (patch: Partial<Palette>) => void;
}) {
  return (
    <div>
      <SectionHeader
        num="02 · COLORS"
        title="the palette."
        sub={
          palette.rationale ||
          "edit any swatch — every logo and graphic re-renders live with the new color."
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-md">
        {PALETTE_KEYS.map(({ key, label, role }) => (
          <Swatch
            key={key}
            label={label}
            role={role}
            hex={palette[key] as string}
            onChange={(next) => onUpdate({ [key]: next } as Partial<Palette>)}
          />
        ))}
      </div>
    </div>
  );
}

function Swatch({
  label,
  role,
  hex,
  onChange,
}: {
  label: string;
  role: string;
  hex: string;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState(hex);
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-white border-hairline border-border rounded-md overflow-hidden">
      <label className="block cursor-pointer">
        <input
          type="color"
          value={hex}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            onChange(next);
          }}
          className="sr-only"
        />
        <div className="h-[80px]" style={{ background: hex }} />
      </label>
      <div className="px-md py-sm">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-ink4 mb-xs">{role}</div>
        <div className="flex items-center gap-xs">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (/^#[0-9a-fA-F]{6}$/.test(draft) && draft !== hex) {
                onChange(draft);
              } else {
                setDraft(hex);
              }
            }}
            className="flex-1 min-w-0 font-mono text-[11px] bg-transparent border-none p-0 focus:outline-none text-ink2"
          />
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(hex);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              } catch {
                // clipboard blocked
              }
            }}
            className="text-[10px] text-ink4 hover:text-ink"
          >
            {copied ? "✓" : "copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

const FONT_OPTIONS = [
  "Inter",
  "Manrope",
  "DM Sans",
  "Plus Jakarta Sans",
  "Cormorant Garamond",
  "Fraunces",
  "Playfair Display",
  "Lora",
  "IBM Plex Sans",
  "IBM Plex Serif",
  "Space Grotesk",
  "Geist",
  "Geist Mono",
  "Söhne",
  "system-ui",
];

function TypographySection({
  typography,
  onUpdate,
}: {
  typography: Typography;
  onUpdate: (patch: Partial<Typography>) => void;
}) {
  return (
    <div>
      <SectionHeader
        num="03 · TYPOGRAPHY"
        title="the type system."
        sub={
          typography.rationale ||
          "two faces. heading + body. pick from the dropdown — google fonts and system stacks."
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <FontPicker
          label="heading"
          value={typography.headingFont}
          onChange={(v) => onUpdate({ headingFont: v })}
          sample="i posted 3 things this week."
          size="36px"
          weight={500}
        />
        <FontPicker
          label="body"
          value={typography.bodyFont}
          onChange={(v) => onUpdate({ bodyFont: v })}
          sample="8,400 people saw them. three customers messaged you — i handled them."
          size="16px"
          weight={400}
        />
      </div>
      <div className="text-xs text-ink4 mt-md">
        weights: {typography.weights.join(" / ")}
      </div>
    </div>
  );
}

function FontPicker({
  label,
  value,
  onChange,
  sample,
  size,
  weight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  sample: string;
  size: string;
  weight: number;
}) {
  return (
    <div className="bg-white border-hairline border-border rounded-[16px] p-lg">
      <div className="flex items-center justify-between mb-md">
        <div className="text-[11px] text-ink4 tracking-[0.1em]">
          {label.toUpperCase()}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs bg-transparent border-hairline border-border rounded-full px-sm py-[4px] focus:outline-none focus:border-ink"
        >
          {[...new Set([value, ...FONT_OPTIONS])].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div
        className="leading-tight"
        style={{
          fontFamily: `${value}, system-ui, sans-serif`,
          fontSize: size,
          fontWeight: weight,
          letterSpacing: "-0.02em",
        }}
      >
        {sample}
      </div>
      <div className="font-mono text-[11px] text-ink4 mt-md">{value}</div>
    </div>
  );
}

function GraphicsSection({
  graphics,
  palette,
}: {
  graphics: string[];
  palette: Palette;
}) {
  if (graphics.length === 0) return null;
  return (
    <div>
      <SectionHeader
        num="04 · GRAPHICS"
        title="brand cover graphics."
        sub="three abstract svg compositions for social headers, presentation slides, and email covers. all use your palette tokens."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {graphics.map((svg, i) => {
          const rendered = applyPalette(svg, palette);
          return (
            <div
              key={i}
              className="bg-white border-hairline border-border rounded-[16px] overflow-hidden"
            >
              <div
                className="aspect-[1200/630] flex items-center justify-center"
                style={{ background: palette.bg }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={svgDataUri(rendered)}
                  alt={`graphic ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-lg py-md flex items-center justify-between">
                <div className="text-xs text-ink4">graphic {i + 1}</div>
                <button
                  type="button"
                  onClick={() => downloadSvg(`graphic-${i + 1}.svg`, rendered)}
                  className="font-mono text-[11px] text-ink3 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
                >
                  ↓ svg
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoiceSection({ voice }: { voice: VoiceTone | null }) {
  if (!voice) return null;
  const { voiceTone, brandValues, contentPillars, doNotDoList, audienceSegments } =
    voice;
  const hasContent =
    (voiceTone?.length ?? 0) > 0 ||
    (brandValues?.length ?? 0) > 0 ||
    (contentPillars?.length ?? 0) > 0 ||
    (doNotDoList?.length ?? 0) > 0;
  if (!hasContent) return null;
  return (
    <div>
      <SectionHeader
        num="09 · VOICE"
        title="how the brand sounds."
        sub="frozen from your strategist run. echo + signal both write to this voice. edit the live version on /specialist/strategist."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {voiceTone && voiceTone.length > 0 ? (
          <VoiceCard label="voice tone" items={voiceTone} />
        ) : null}
        {brandValues && brandValues.length > 0 ? (
          <VoiceCard label="brand values" items={brandValues} />
        ) : null}
        {contentPillars && contentPillars.length > 0 ? (
          <VoiceCard label="content pillars" items={contentPillars} />
        ) : null}
        {doNotDoList && doNotDoList.length > 0 ? (
          <VoiceCard label="do not do" items={doNotDoList} tone="dont" />
        ) : null}
      </div>
      {audienceSegments && audienceSegments.length > 0 ? (
        <div className="mt-md">
          <Card>
            <div className="text-[11px] text-ink4 mb-md tracking-[0.1em]">
              AUDIENCE
            </div>
            <div className="flex flex-col gap-md">
              {audienceSegments.map((seg, i) => (
                <div key={i}>
                  <div className="text-sm font-medium mb-xs">{seg.name}</div>
                  <p className="text-sm text-ink3 leading-relaxed">
                    {seg.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function VoiceCard({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone?: "do" | "dont";
}) {
  return (
    <Card>
      <div
        className={`font-mono text-[10px] tracking-[0.15em] mb-md ${
          tone === "dont" ? "text-urgent" : "text-ink4"
        }`}
      >
        {label.toUpperCase()}
      </div>
      <ul className="flex flex-col gap-sm">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-ink2 leading-relaxed">
            · {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ImageStyleSection({
  imageStyle,
  editing,
  draft,
  onStart,
  onCancel,
  onChange,
  onSave,
  pending,
  error,
}: {
  imageStyle: string;
  editing: boolean;
  draft: string;
  onStart: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div>
      <SectionHeader
        num="05 · IMAGE STYLE"
        title="how echo draws photos."
        sub="this prompt prefix is prepended to every photo echo generates for blog/social. tweak it to bias the look without burning a regeneration."
      />
      <Card>
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => onChange(e.target.value)}
              rows={4}
              className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink leading-relaxed"
            />
            <div className="flex items-center gap-sm mt-md">
              <button
                type="button"
                onClick={onSave}
                disabled={pending || draft.trim().length < 20}
                className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full disabled:opacity-40"
              >
                {pending ? "saving..." : "save"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors"
              >
                cancel
              </button>
            </div>
            {error ? (
              <p className="text-sm text-urgent mt-sm">{error}</p>
            ) : null}
          </>
        ) : (
          <div className="flex items-start justify-between gap-md">
            <p className="text-sm text-ink2 leading-relaxed flex-1">
              {imageStyle}
            </p>
            <button
              type="button"
              onClick={onStart}
              className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors shrink-0"
            >
              edit
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

function AssetsSection({
  logos,
  palette,
  typography,
}: {
  logos: LogoTemplates;
  palette: Palette;
  typography: Typography;
}) {
  const renderedLogos = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(logos).map(([k, v]) => [k, applyPalette(v, palette)]),
      ) as LogoTemplates,
    [logos, palette],
  );

  const tokens = {
    name: "brand kit tokens",
    version: "1.0.0",
    palette,
    typography,
  };

  return (
    <div>
      <SectionHeader
        num="06 · ASSETS"
        title="downloads."
        sub="every logo as svg + a tokens.json with all palette + typography values for handing off to a designer."
      />
      <div className="bg-white border-hairline border-border rounded-[16px] divide-y divide-border2">
        {LOGO_DEFS.map((def) => (
          <AssetRow
            key={def.key}
            name={`logo-${def.key}.svg`}
            meta={`SVG · ${def.label.toUpperCase()}`}
            onClick={() =>
              downloadSvg(`logo-${def.key}.svg`, renderedLogos[def.key])
            }
          />
        ))}
        <AssetRow
          name="tokens.json"
          meta="DESIGN TOKENS · COLORS + TYPOGRAPHY"
          onClick={() => downloadJson("tokens.json", tokens)}
        />
      </div>
    </div>
  );
}

function AssetRow({
  name,
  meta,
  onClick,
}: {
  name: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-lg py-md flex items-center justify-between gap-md hover:bg-surface transition-colors"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="font-mono text-[11px] text-ink4 truncate">{meta}</div>
      </div>
      <span className="font-mono text-[11px] text-ink3 shrink-0">
        download →
      </span>
    </button>
  );
}

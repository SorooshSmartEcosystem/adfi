"use client";
import { useState } from "react";
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

type LogoVariants = {
  primary: string;
  mark: string;
  monochrome: string;
  lightOnDark: string;
};

const PALETTE_LABELS: { key: keyof Palette; label: string }[] = [
  { key: "primary", label: "primary" },
  { key: "secondary", label: "secondary" },
  { key: "accent", label: "accent" },
  { key: "ink", label: "ink" },
  { key: "surface", label: "surface" },
  { key: "bg", label: "background" },
];

const LOGO_LABELS: { key: keyof LogoVariants; label: string }[] = [
  { key: "primary", label: "primary" },
  { key: "mark", label: "icon mark" },
  { key: "monochrome", label: "monochrome" },
  { key: "lightOnDark", label: "light on dark" },
];

export function BrandKitPanel() {
  const utils = trpc.useUtils();
  const query = trpc.brandKit.getMine.useQuery();
  const generate = trpc.brandKit.generate.useMutation({
    onSuccess: () => utils.brandKit.getMine.invalidate(),
  });
  const updatePrompt = trpc.brandKit.updateImageStyle.useMutation({
    onSuccess: () => utils.brandKit.getMine.invalidate(),
  });

  const [hint, setHint] = useState("");
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");

  if (query.isLoading) {
    return <p className="text-sm text-ink3">one second</p>;
  }
  if (!query.data) return null;

  const { kit, plan, quota, generationCostCents, monthlyCap } = query.data;
  const remainingLine =
    quota.remaining > 0
      ? `${quota.remaining}/${monthlyCap} generations left this month on the ${plan.toLowerCase()} plan · ~$${(generationCostCents / 100).toFixed(2)} per regenerate`
      : `you've used all ${monthlyCap} generations this month — upgrade or wait for the rolling window to refresh`;

  if (!kit) {
    return (
      <Card>
        <div className="text-md font-medium mb-sm">no brand kit yet</div>
        <p className="text-sm text-ink3 leading-relaxed mb-md">
          generate a palette, typography pairing, four logo variants, and three
          cover sample images — all in your voice. echo will use this look on
          every image it draws afterward.
        </p>
        <div className="text-xs text-ink4 mb-md">{remainingLine}</div>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="optional hint — e.g. 'softer palette', 'editorial newsroom feel'"
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
  const logoVariants = kit.logoVariants as unknown as LogoVariants;
  const coverSamples = (kit.coverSamples as unknown as string[]) ?? [];

  return (
    <div className="flex flex-col gap-lg">
      <Card>
        <div className="flex items-baseline justify-between flex-wrap gap-sm mb-md">
          <div>
            <div className="text-md font-medium">version {kit.version}</div>
            <div className="text-xs text-ink4">
              generated{" "}
              {new Date(kit.generatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="text-xs text-ink4 max-w-[320px] text-right">
            {remainingLine}
          </div>
        </div>

        <div className="flex flex-wrap gap-sm mt-md">
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="optional hint — e.g. 'bolder accent', 'less corporate'"
            disabled={generate.isPending}
            className="flex-1 min-w-[240px] px-md py-[8px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
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
            {generate.isPending ? "drawing..." : "regenerate →"}
          </button>
        </div>
        {generate.error ? (
          <p className="text-sm text-urgent mt-sm">{generate.error.message}</p>
        ) : null}
      </Card>

      <Card>
        <div className="text-xs text-ink4 mb-md">palette</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-md">
          {PALETTE_LABELS.map(({ key, label }) => {
            const hex = palette[key];
            return <Swatch key={key} label={label} hex={hex as string} />;
          })}
        </div>
        {palette.rationale ? (
          <p className="text-sm text-ink3 leading-relaxed mt-md">
            {palette.rationale}
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="text-xs text-ink4 mb-md">typography</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div>
            <div className="text-[11px] text-ink4 mb-xs">heading</div>
            <div
              className="text-2xl font-medium"
              style={{ fontFamily: typography.headingFont }}
            >
              {typography.headingFont}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-ink4 mb-xs">body</div>
            <div
              className="text-md leading-relaxed"
              style={{ fontFamily: typography.bodyFont }}
            >
              {typography.bodyFont} — every body copy paragraph adfi writes
              renders in this face when published to channels we control.
            </div>
          </div>
        </div>
        <div className="text-xs text-ink4 mt-md">
          weights: {typography.weights.join(" / ")}
        </div>
        {typography.rationale ? (
          <p className="text-sm text-ink3 leading-relaxed mt-md">
            {typography.rationale}
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="text-xs text-ink4 mb-md">logo variants</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {LOGO_LABELS.map(({ key, label }) => (
            <LogoTile
              key={key}
              label={label}
              src={logoVariants[key]}
              dark={key === "lightOnDark"}
            />
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-xs text-ink4 mb-md">cover samples</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {coverSamples.map((url, i) => (
            <CoverTile key={i} src={url} index={i} />
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between mb-sm">
          <div className="text-xs text-ink4">image style prompt</div>
          {!editingPrompt ? (
            <button
              type="button"
              onClick={() => {
                setPromptDraft(kit.imageStyle);
                setEditingPrompt(true);
              }}
              className="text-xs text-ink2 hover:text-ink"
            >
              edit
            </button>
          ) : null}
        </div>
        {editingPrompt ? (
          <>
            <textarea
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              rows={4}
              className="w-full px-md py-sm bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink leading-relaxed"
            />
            <div className="flex items-center gap-sm mt-md">
              <button
                type="button"
                onClick={() => {
                  if (promptDraft.trim().length < 20) return;
                  updatePrompt.mutate(
                    { imageStyle: promptDraft.trim() },
                    { onSuccess: () => setEditingPrompt(false) },
                  );
                }}
                disabled={
                  updatePrompt.isPending || promptDraft.trim().length < 20
                }
                className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full disabled:opacity-40"
              >
                {updatePrompt.isPending ? "saving..." : "save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingPrompt(false)}
                className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors"
              >
                cancel
              </button>
            </div>
            {updatePrompt.error ? (
              <p className="text-sm text-urgent mt-sm">
                {updatePrompt.error.message}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-ink2 leading-relaxed">{kit.imageStyle}</p>
        )}
      </Card>
    </div>
  );
}

function Swatch({ label, hex }: { label: string; hex: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(hex);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // clipboard blocked — fail silently, hex is visible inline
        }
      }}
      className="text-left group"
    >
      <div
        className="w-full h-[80px] rounded-md border-hairline border-border mb-xs"
        style={{ background: hex }}
        aria-label={label}
      />
      <div className="text-[11px] text-ink4">{label}</div>
      <div className="text-xs font-mono text-ink2 group-hover:text-ink">
        {copied ? "copied" : hex}
      </div>
    </button>
  );
}

function LogoTile({
  label,
  src,
  dark,
}: {
  label: string;
  src: string;
  dark?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`aspect-square rounded-md border-hairline border-border mb-xs flex items-center justify-center overflow-hidden ${
          dark ? "bg-ink" : "bg-white"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="w-full h-full object-contain"
        />
      </div>
      <div className="text-[11px] text-ink4 mb-xs">{label}</div>
      <a
        href={src}
        download={`logo-${label.replace(/\s+/g, "-")}.webp`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-ink2 hover:text-ink underline"
      >
        download
      </a>
    </div>
  );
}

function CoverTile({ src, index }: { src: string; index: number }) {
  return (
    <div>
      <div className="aspect-[16/9] rounded-md border-hairline border-border mb-xs overflow-hidden bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink4">sample {index + 1}</span>
        <a
          href={src}
          download={`cover-${index + 1}.webp`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink2 hover:text-ink underline"
        >
          download
        </a>
      </div>
    </div>
  );
}

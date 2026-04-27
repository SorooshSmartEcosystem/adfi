"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";

type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  surface: string;
  bg: string;
};
type Logos = {
  primary: string;
  mark: string;
  monochrome: string;
  lightOnDark: string;
  wordmark: string;
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

export function BrandKitOnboardingForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const query = trpc.brandKit.getMine.useQuery();
  const [hint, setHint] = useState("");
  const generate = trpc.brandKit.generate.useMutation({
    onSuccess: () => utils.brandKit.getMine.invalidate(),
  });

  const finishMutation = trpc.onboarding.complete.useMutation({
    onSuccess: () => router.push("/dashboard"),
    onError: () => router.push("/dashboard"),
  });
  const [finishing, setFinishing] = useState(false);

  function handleSkip() {
    setFinishing(true);
    finishMutation.mutate();
  }

  function handleAccept() {
    setFinishing(true);
    finishMutation.mutate();
  }

  const kit = query.data?.kit ?? null;
  const palette = kit ? (kit.palette as unknown as Palette) : null;
  const logos = kit ? (kit.logoTemplates as unknown as Logos) : null;

  return (
    <OnboardingShell step={7} wide>
      <OnboardingHeading
        title="design the look."
        sub="i'll generate a palette, fonts, four logo variants, and three cover samples — all matched to your voice. you can keep it, regenerate, or skip and do this later from /brandkit."
      />

      {!kit ? (
        <div className="flex flex-col gap-md mb-lg">
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="optional — 'softer palette', 'editorial newsroom feel'"
            disabled={generate.isPending}
            className="w-full px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
          />
          <PrimaryButton
            onClick={() =>
              generate.mutate(
                hint.trim() ? { refinementHint: hint.trim() } : {},
              )
            }
            disabled={generate.isPending}
          >
            {generate.isPending ? "drawing your kit..." : "generate brand kit →"}
          </PrimaryButton>
          {generate.error ? (
            <p className="text-sm text-urgent">{generate.error.message}</p>
          ) : null}
        </div>
      ) : (
        <>
          {palette ? (
            <div className="grid grid-cols-6 gap-xs mb-md">
              {(["primary", "secondary", "accent", "ink", "surface", "bg"] as const).map(
                (k) => (
                  <div
                    key={k}
                    className="aspect-square rounded-md border-hairline border-border"
                    style={{ background: palette[k] }}
                    title={`${k} · ${palette[k]}`}
                  />
                ),
              )}
            </div>
          ) : null}

          {logos && palette ? (
            <div className="grid grid-cols-4 gap-sm mb-md">
              {(["primary", "mark", "monochrome", "lightOnDark"] as const).map(
                (k) => {
                  const rendered = logos[k]
                    ? applyPalette(logos[k], palette)
                    : "";
                  return (
                    <div
                      key={k}
                      className="aspect-square rounded-md border-hairline border-border overflow-hidden flex items-center justify-center p-sm [&>svg]:w-full [&>svg]:h-full"
                      style={{
                        background: k === "lightOnDark" ? palette.ink : palette.bg,
                      }}
                      dangerouslySetInnerHTML={
                        rendered ? { __html: cleanSvg(rendered) } : undefined
                      }
                    />
                  );
                },
              )}
            </div>
          ) : null}

          <div className="text-xs text-ink4 mb-md leading-relaxed">
            you can fine-tune everything later in /brandkit — palette, fonts,
            image style, and logo variants are all editable.
          </div>

          <div className="flex flex-col gap-sm mb-md">
            <PrimaryButton onClick={handleAccept} disabled={finishing}>
              {finishing ? "almost there..." : "looks good — finish setup"}
            </PrimaryButton>
            <button
              type="button"
              onClick={() =>
                generate.mutate(
                  hint.trim() ? { refinementHint: hint.trim() } : {},
                )
              }
              disabled={generate.isPending}
              className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[8px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
            >
              {generate.isPending ? "redrawing..." : "regenerate with hint"}
            </button>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="hint for regenerate (optional)"
              disabled={generate.isPending}
              className="w-full px-md py-[8px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
            />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={handleSkip}
        disabled={finishing}
        className="block w-full text-center text-xs text-ink4 hover:text-ink mt-sm"
      >
        skip for now
      </button>
    </OnboardingShell>
  );
}

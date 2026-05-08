"use client";

// ScriptPreview — opens after the user generates a video script for
// a draft. Shows the scene list + an embedded Remotion <Player> that
// plays the script in-browser at 60fps with ZERO Lambda cost. User
// scrubs, watches, then either approves to render the mp4 OR regens
// the script with a tweak prompt.
//
// Cost path:
//   - Free: preview the script (browser playback only)
//   - 0.4¢: regenerate the script
//   - 1.1¢: render the mp4 (Lambda call)
//
// Today's flow burns 1.1¢ on every render attempt because user can't
// see the script first. This component fixes that.

import { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import {
  ScriptReel,
  computeScriptFrames,
  applyPresetTokens,
} from "@orb/motion-reel/client";
import { trpc } from "../../lib/trpc";
import {
  OrbLoader,
  STAGES_VIDEO_RENDER,
  STAGES_VIDEO_SCRIPT,
} from "../shared/orb-loader";

const FPS = 30;

type Scene = {
  type: string;
  duration: number;
  // Plus any scene-specific fields. We don't need to type-narrow here
  // because <ScriptReel> handles that.
  [key: string]: unknown;
};

type Script = {
  scenes: Scene[];
  design: Record<string, unknown>;
};

type Tokens = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  alive: string;
  aliveDark: string;
  attnBg: string;
  attnBorder: string;
  attnText: string;
  markInner?: string;
  businessName: string;
};

type Props = {
  draftId: string;
  script: Script | null;
  tokens: Tokens;
  onClose: () => void;
  onRendered?: (mp4Url: string) => void;
  // When true, the drawer is opened before the script has been
  // generated. Caller passes their mutation's `isPending` flag —
  // the drawer renders a "sketching script…" loader until the
  // script lands and the parent re-renders with a non-null script.
  pending?: boolean;
};

// Preset names the dropdown can flip to. Two are real (editorial-bold
// and dashboard-tech ship live token overrides); the other four are
// placeholders that currently fall through to editorial-bold's tokens.
// Listed anyway so the user can verify "yes, soft-minimal does NOT
// look different yet" instead of wondering whether it's broken.
const PRESETS_FOR_PREVIEW = [
  { value: "editorial-bold", label: "editorial-bold (white, heavy black) — live" },
  { value: "dashboard-tech", label: "dashboard-tech (dark, cyan/amber) — live" },
  { value: "soft-minimal", label: "soft-minimal — falls back to editorial-bold" },
  { value: "luxury", label: "luxury — falls back to editorial-bold" },
  { value: "studio-craft", label: "studio-craft — falls back to editorial-bold" },
  { value: "documentary", label: "documentary — falls back to editorial-bold" },
] as const;

export function ScriptPreview({
  draftId,
  script,
  tokens,
  onClose,
  onRendered,
  pending,
}: Props) {
  const [editedScript, setEditedScript] = useState<Script | null>(script);
  // Preview-only preset override. Lets the user flip the in-browser
  // Player between styles with one click, without regenerating the
  // script. The mp4 render still uses the script's actual preset
  // field (which gets sent to Lambda) — preview override is browser-only.
  const [previewPreset, setPreviewPreset] = useState<string | null>(null);
  // Fullscreen preview toggle. Default off (drawer-sized 320px-wide
  // Player). When on, the Player blows up to fill the viewport so
  // you can actually see motion details that get lost at small size.
  const [fullscreen, setFullscreen] = useState(false);
  const utils = trpc.useUtils();

  // ALL HOOKS MUST RUN BEFORE ANY EARLY RETURN (React rules of hooks).
  // Previously useMutation was called *after* the pending/!editedScript
  // early return, which meant the hook count changed across renders
  // (skipped on the loading render, called on the loaded render) →
  // React error #310 → app error boundary swallowed the page. The
  // ~10s backfill step shipped 2026-05-07 widened the timing gap and
  // started reliably triggering the latent bug.
  const render = trpc.motionReel.renderScript.useMutation({
    onSuccess: (data) => {
      utils.content.listDrafts.invalidate();
      onRendered?.(data.mp4Url);
    },
  });

  // Sync editedScript when the script prop transitions null → object.
  // useEffect (not a render-time setState) avoids the same Rules of
  // Hooks pitfall and the "setState during render" warning.
  useEffect(() => {
    if (script && !editedScript) {
      setEditedScript(script);
    }
  }, [script, editedScript]);

  // Drawer-with-script-loading state — the scene the user clicks
  // "tap to create video" first lands here.
  if (pending || !editedScript) {
    return (
      <Drawer onClose={onClose}>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-md">
          <OrbLoader tone="alive" size="lg" stages={STAGES_VIDEO_SCRIPT} />
          <div className="font-mono text-[11px] text-ink2 tracking-[0.16em]">
            sketching video script…
          </div>
          <div className="font-mono text-[10px] text-ink4">
            ~5–15s · ~0.4¢
          </div>
        </div>
      </Drawer>
    );
  }

  const totalDurationSec = editedScript.scenes.reduce(
    (s, sc) => s + (sc.duration ?? 3),
    0,
  );
  const totalFrames = computeScriptFrames(
    editedScript as unknown as Parameters<typeof computeScriptFrames>[0],
    FPS,
  );

  if (render.isPending) {
    return (
      <Drawer onClose={onClose}>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-md">
          <OrbLoader tone="alive" size="lg" stages={STAGES_VIDEO_RENDER} />
          <div className="font-mono text-[11px] text-ink4 mt-md">
            ~30s · ~1.1¢
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer onClose={onClose}>
      <div className="flex flex-col gap-lg">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[11px] text-ink4 tracking-[0.18em] mb-xs">
              VIDEO SCRIPT
            </div>
            <h2 className="text-xl font-medium text-ink">
              {editedScript.scenes.length} scenes · {totalDurationSec}s
            </h2>
            <p className="text-sm text-ink3 mt-xs">
              preview is free. rendering the mp4 is ~1.1¢.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-ink3 hover:text-ink"
          >
            close
          </button>
        </div>

        {/* Style preview selector. Dev/QA tool that lets the user flip
            the Player between presets WITHOUT regenerating the script.
            Two options ship real visual overrides today (editorial-bold,
            dashboard-tech); the other four currently fall back to
            editorial-bold tokens — listed so users can verify they
            don't yet differ. */}
        <div className="flex items-center gap-sm flex-wrap">
          <span className="font-mono text-[10px] text-ink4 tracking-[0.18em]">
            STYLE PREVIEW
          </span>
          <select
            value={
              previewPreset ??
              (editedScript as { preset?: string }).preset ??
              "editorial-bold"
            }
            onChange={(e) => setPreviewPreset(e.target.value)}
            className="font-mono text-[11px] bg-bg border-hairline border-border rounded px-sm py-[5px] text-ink2 cursor-pointer"
          >
            {PRESETS_FOR_PREVIEW.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {previewPreset ? (
            <button
              type="button"
              onClick={() => setPreviewPreset(null)}
              className="font-mono text-[10px] text-ink4 hover:text-ink underline"
            >
              reset to script default
            </button>
          ) : null}
        </div>

        {/* Player + Scene list side by side on desktop, stacked on mobile.
            Player column was 320px (cramped). Bumped to 480px on md+
            and 560px on lg+ so the new motion primitives — masks,
            particles, camera moves — are actually visible. Fullscreen
            toggle blows it up further when you want to QA details. */}
        <div className="grid md:grid-cols-[480px_1fr] lg:grid-cols-[560px_1fr] gap-lg items-start">
          {/* Player */}
          <div className="bg-black rounded-md overflow-hidden relative">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="absolute top-sm right-sm z-10 font-mono text-[10px] text-white/70 hover:text-white bg-black/40 backdrop-blur-sm rounded px-sm py-[3px]"
              title="open fullscreen preview"
            >
              ⛶ fullscreen
            </button>
            <Player
              component={ScriptReel}
              durationInFrames={totalFrames}
              fps={FPS}
              compositionWidth={1080}
              compositionHeight={1920}
              inputProps={
                {
                  // Preview-override beats the script's stored preset so
                  // the dropdown lets users compare styles instantly.
                  tokens: applyPresetTokens(
                    tokens as never,
                    previewPreset ??
                      (editedScript as { preset?: string }).preset,
                  ),
                  script: previewPreset
                    ? { ...editedScript, preset: previewPreset }
                    : editedScript,
                } as never
              }
              controls
              loop
              autoPlay
              clickToPlay={false}
              style={{ aspectRatio: "9 / 16", width: "100%" }}
            />
          </div>

          {/* Scene list */}
          <div className="flex flex-col gap-sm">
            <div className="font-mono text-[10px] text-ink4 tracking-[0.18em]">
              SCENES
            </div>
            {editedScript.scenes.map((scene, i) => (
              <SceneRow
                key={i}
                index={i}
                scene={scene}
                onDurationChange={(d) => {
                  const next = [...editedScript.scenes];
                  next[i] = { ...scene, duration: d };
                  setEditedScript({ ...editedScript, scenes: next });
                }}
              />
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-md flex-wrap pt-md border-t-hairline border-border">
          <button
            type="button"
            onClick={() =>
              render.mutate({ draftId, script: editedScript as never })
            }
            className="bg-ink text-white text-sm font-medium px-md py-[10px] rounded-full hover:opacity-85 transition-opacity"
          >
            ⚡ render mp4 · ~1.1¢
          </button>
          <span className="font-mono text-[11px] text-ink4">
            preview is free · render only when you're happy
          </span>
        </div>

        {render.error ? (
          <div className="font-mono text-[11px] text-urgent">
            {render.error.message}
          </div>
        ) : null}
      </div>

      {/* Fullscreen preview overlay — blows the Player up to fill the
          viewport so motion primitives are actually visible. Same
          inputProps as the small Player; same preset preview override
          applies. */}
      {fullscreen ? (
        <div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(false);
            }}
            className="absolute top-md right-md font-mono text-xs text-white/80 hover:text-white bg-white/10 backdrop-blur-sm rounded-full px-md py-[8px] z-10"
          >
            close fullscreen · esc
          </button>
          <div
            className="h-[92vh] aspect-[9/16] bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <Player
              component={ScriptReel}
              durationInFrames={totalFrames}
              fps={FPS}
              compositionWidth={1080}
              compositionHeight={1920}
              inputProps={
                {
                  tokens: applyPresetTokens(
                    tokens as never,
                    previewPreset ??
                      (editedScript as { preset?: string }).preset,
                  ),
                  script: previewPreset
                    ? { ...editedScript, preset: previewPreset }
                    : editedScript,
                } as never
              }
              controls
              loop
              autoPlay
              clickToPlay={false}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function Drawer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[920px] bg-bg overflow-y-auto p-2xl shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function SceneRow({
  index,
  scene,
  onDurationChange,
}: {
  index: number;
  scene: Scene;
  onDurationChange: (duration: number) => void;
}) {
  const summary = sceneSummary(scene);
  return (
    <div className="bg-surface border-hairline border-border rounded-md px-md py-sm flex items-center gap-sm">
      <span className="font-mono text-[10px] tabular-nums text-ink4 w-6 shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="font-mono text-[11px] text-aliveDark uppercase tracking-[0.16em] w-20 shrink-0">
        {scene.type}
      </span>
      <span className="text-xs text-ink2 truncate flex-1" dir="auto">
        {summary}
      </span>
      <input
        type="number"
        value={scene.duration}
        onChange={(e) => onDurationChange(Number(e.target.value))}
        min={1.5}
        max={10}
        step={0.5}
        className="w-14 px-xs py-[3px] bg-bg border-hairline border-border rounded text-xs text-ink2 text-right"
      />
      <span className="text-[10px] text-ink4 -ml-1">s</span>
    </div>
  );
}

function sceneSummary(scene: Scene): string {
  const s = scene as Record<string, unknown>;
  if (typeof s.headline === "string") return s.headline;
  if (typeof s.line === "string") return s.line;
  if (typeof s.quote === "string") return s.quote.slice(0, 80);
  if (typeof s.title === "string") return s.title;
  if (typeof s.value === "string" || typeof s.value === "number") {
    return `${s.prefix ?? ""}${s.value}${s.suffix ?? ""} · ${s.label ?? ""}`;
  }
  if (Array.isArray(s.hashtags)) {
    return (s.hashtags as string[]).slice(0, 3).join(" ");
  }
  if (typeof s.cta === "string") return s.cta;
  return scene.type;
}

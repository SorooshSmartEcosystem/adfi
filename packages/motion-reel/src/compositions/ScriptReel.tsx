// ScriptReel — Sequence-based composition. Plays a script of scenes
// back-to-back via Remotion's <Sequence>. Each scene's local frame
// starts at 0 inside its own block, so all scene components can
// use useCurrentFrame() naturally without offset math.
//
// Total duration = sum of scene durations × pace multiplier.
//
// Phase 1 additions:
//   - pace knob is now functional. Scene durations are multiplied
//     (slow=1.35, medium=1.0, fast=0.75) so the agent's relative
//     pacing is preserved while absolute speed actually changes.
//   - Each scene gets a deterministic transition layered into its
//     first ~12 frames (wipe / flash / blur / match-cut shape) chosen
//     by scene index. This produces transition variety without an
//     extra agent call.
//   - Animated film grain runs over every scene as a single
//     composition-level overlay. Removes the "AI-glossy" sheen that
//     currently makes our reels read as PowerPoint exports.

import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { HookScene } from "../scenes/HookScene";
import { StatScene } from "../scenes/StatScene";
import { DataBarScene } from "../scenes/DataBarScene";
import { ContrastScene } from "../scenes/ContrastScene";
import { QuoteScene } from "../scenes/QuoteScene";
import { PunchlineScene } from "../scenes/PunchlineScene";
import { ListScene } from "../scenes/ListScene";
import { HashtagScene } from "../scenes/HashtagScene";
import { BrandStampScene } from "../scenes/BrandStampScene";
// editorial-bold preset scenes
import { BoldStatementScene } from "../presets/editorial-bold/BoldStatementScene";
import { IconListScene } from "../presets/editorial-bold/IconListScene";
import { NumberedDiagramScene } from "../presets/editorial-bold/NumberedDiagramScene";
import { EditorialOpenerScene } from "../presets/editorial-bold/EditorialOpenerScene";
import { EditorialClosingScene } from "../presets/editorial-bold/EditorialClosingScene";
import { GrainOverlay } from "../primitives/GrainOverlay";
import { WipeReveal } from "../transitions/WipeReveal";
import { ColorFlash } from "../transitions/ColorFlash";
import { BlurDip } from "../transitions/BlurDip";
import { MatchCutShape } from "../transitions/MatchCutShape";
import { paceMultiplier } from "../motion/pace";
import type { BrandTokens, Scene, VideoDesign, VideoScript } from "../types";

type Props = {
  tokens: BrandTokens;
  script: VideoScript;
};

export const ScriptReel: React.FC<Props> = ({ tokens, script }) => {
  const { fps } = useVideoConfig();
  const design = resolveDesign(script.design);
  const scenes = clampScenes(script.scenes);
  const paceMul = paceMultiplier(design.pace);
  const accent = accentColor(design.accent, tokens);

  let cursor = 0;
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      {scenes.map((scene, i) => {
        const frames = Math.max(
          15,
          Math.round(scene.duration * paceMul * fps),
        );
        const from = cursor;
        cursor += frames;
        return (
          <Sequence key={i} from={from} durationInFrames={frames}>
            <SceneSwitch
              tokens={tokens}
              scene={scene}
              design={design}
              sceneIndex={i}
            />
            <SceneTransition
              index={i}
              accent={accent}
              ink={tokens.ink}
              bg={tokens.bg}
            />
          </Sequence>
        );
      })}
      {/* Grain on top of everything, masked at the AbsoluteFill level
          so it tints scenes uniformly without being part of any
          single Sequence. */}
      <GrainOverlay intensity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};

const SceneSwitch: React.FC<{
  tokens: BrandTokens;
  scene: Scene;
  design: Required<VideoDesign>;
  sceneIndex: number;
}> = ({ tokens, scene, design, sceneIndex }) => {
  switch (scene.type) {
    case "hook":
      return <HookScene tokens={tokens} scene={scene} design={design} />;
    case "stat":
      return <StatScene tokens={tokens} scene={scene} design={design} />;
    case "data-bar":
      return <DataBarScene tokens={tokens} scene={scene} design={design} />;
    case "contrast":
      return <ContrastScene tokens={tokens} scene={scene} design={design} />;
    case "quote":
      return <QuoteScene tokens={tokens} scene={scene} design={design} />;
    case "punchline":
      return <PunchlineScene tokens={tokens} scene={scene} design={design} />;
    case "list":
      return <ListScene tokens={tokens} scene={scene} design={design} />;
    case "hashtags":
      return <HashtagScene tokens={tokens} scene={scene} design={design} />;
    case "brand-stamp":
      return <BrandStampScene tokens={tokens} scene={scene} design={design} />;
    // ── editorial-bold preset ─────────────────────────────────────
    case "bold-statement":
      return (
        <BoldStatementScene
          tokens={tokens}
          scene={scene}
          design={design}
          sceneIndex={sceneIndex}
        />
      );
    case "icon-list":
      return <IconListScene tokens={tokens} scene={scene} design={design} />;
    case "numbered-diagram":
      return (
        <NumberedDiagramScene tokens={tokens} scene={scene} design={design} />
      );
    case "editorial-opener":
      return (
        <EditorialOpenerScene tokens={tokens} scene={scene} design={design} />
      );
    case "editorial-closer":
      return (
        <EditorialClosingScene tokens={tokens} scene={scene} design={design} />
      );
    default:
      // Unknown scene type — render an empty frame rather than crashing.
      return null;
  }
};

// Picks one of four transitions per scene based on a deterministic
// rotation by index. This keeps the same draft rendering identically
// across re-renders while still giving the reel transition variety.
//
//   index % 4 === 0  → wipe-left in accent color (intro hit)
//   index % 4 === 1  → blur dip (focus pull)
//   index % 4 === 2  → color flash (percussive cut)
//   index % 4 === 3  → match-cut dot (continuity through-line)
//
// First scene gets a wipe regardless — sets the rhythm.
const SceneTransition: React.FC<{
  index: number;
  accent: string;
  ink: string;
  bg: string;
}> = ({ index, accent, ink, bg }) => {
  if (index === 0) {
    return <WipeReveal color={ink} direction="down" durationFrames={14} />;
  }
  switch (index % 4) {
    case 0:
      return <WipeReveal color={accent} direction="left" durationFrames={12} />;
    case 1:
      return <BlurDip peakBlur={28} durationFrames={14} />;
    case 2:
      return (
        <ColorFlash color={accent} holdFrames={2} fadeFrames={5} peakOpacity={0.9} />
      );
    case 3:
      return (
        <MatchCutShape
          kind="dot"
          color={accent}
          x={0.5}
          y={0.92}
          size={12}
          introFrames={10}
        />
      );
    default:
      return null;
  }
};

function clampScenes(scenes: Scene[]): Scene[] {
  // Cap at 10 scenes to avoid runaway costs from a misbehaving agent.
  return scenes.slice(0, 10);
}

function resolveDesign(d?: VideoDesign): Required<VideoDesign> {
  return {
    style: d?.style ?? "minimal",
    accent: d?.accent ?? "alive",
    pace: d?.pace ?? "medium",
    statusLabel: d?.statusLabel ?? "TODAY'S NOTE",
    hookLabel: d?.hookLabel ?? "BIG IDEA",
    metaLabel: d?.metaLabel ?? "WHY IT MATTERS",
    closerLabel: d?.closerLabel ?? "MORE COMING",
    mood: d?.mood ?? "confident",
  };
}

function accentColor(
  accent: VideoDesign["accent"],
  tokens: BrandTokens,
): string {
  switch (accent) {
    case "alive":
      return tokens.aliveDark || tokens.alive || "#3a9d5c";
    case "attn":
      return tokens.attnText || "#D9A21C";
    case "urgent":
      return "#C84A3E";
    case "ink":
    default:
      return tokens.ink;
  }
}

// Helper for callers (Root.tsx, render route) to compute total
// duration in frames before instantiating the composition. Must use
// the same pace multiplier the renderer applies inside ScriptReel so
// total frames match.
export function computeScriptFrames(script: VideoScript, fps: number): number {
  const paceMul = paceMultiplier(script.design?.pace);
  const total = script.scenes
    .slice(0, 10)
    .reduce(
      (sum, s) => sum + Math.max(15, Math.round(s.duration * paceMul * fps)),
      0,
    );
  return Math.max(30, total);
}

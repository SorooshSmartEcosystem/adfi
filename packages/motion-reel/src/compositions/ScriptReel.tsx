// ScriptReel — Sequence-based composition. Plays a script of scenes
// back-to-back via Remotion's <Sequence>. Each scene's local frame
// starts at 0 inside its own block, so all scene components can
// use useCurrentFrame() naturally without offset math.
//
// Total duration = sum of scene durations (clamped 6s..30s for sane
// limits). The composition's durationInFrames is set by the host
// (Root.tsx for studio preview, or computed via calculateMetadata
// for the Lambda render route).

import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { HookScene } from "../scenes/HookScene";
import { StatScene } from "../scenes/StatScene";
import { ContrastScene } from "../scenes/ContrastScene";
import { QuoteScene } from "../scenes/QuoteScene";
import { PunchlineScene } from "../scenes/PunchlineScene";
import { ListScene } from "../scenes/ListScene";
import { HashtagScene } from "../scenes/HashtagScene";
import { BrandStampScene } from "../scenes/BrandStampScene";
import type { BrandTokens, Scene, VideoDesign, VideoScript } from "../types";

type Props = {
  tokens: BrandTokens;
  script: VideoScript;
};

export const ScriptReel: React.FC<Props> = ({ tokens, script }) => {
  const { fps } = useVideoConfig();
  const design = resolveDesign(script.design);
  const scenes = clampScenes(script.scenes);

  let cursor = 0;
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      {scenes.map((scene, i) => {
        const frames = Math.max(15, Math.round(scene.duration * fps));
        const from = cursor;
        cursor += frames;
        return (
          <Sequence key={i} from={from} durationInFrames={frames}>
            <SceneSwitch tokens={tokens} scene={scene} design={design} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneSwitch: React.FC<{
  tokens: BrandTokens;
  scene: Scene;
  design: Required<VideoDesign>;
}> = ({ tokens, scene, design }) => {
  switch (scene.type) {
    case "hook":
      return <HookScene tokens={tokens} scene={scene} design={design} />;
    case "stat":
      return <StatScene tokens={tokens} scene={scene} design={design} />;
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
    default: {
      // Unknown scene type — render an empty frame rather than crashing.
      // Useful for forward-compat when the agent emits a type the
      // renderer hasn't shipped yet.
      return null;
    }
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
  };
}

// Helper for callers (Root.tsx, render route) to compute total
// duration in frames before instantiating the composition.
export function computeScriptFrames(script: VideoScript, fps: number): number {
  const total = script.scenes
    .slice(0, 10)
    .reduce((sum, s) => sum + Math.max(15, Math.round(s.duration * fps)), 0);
  // Hard floor 30 frames (1s) so Remotion doesn't error on empty scripts.
  return Math.max(30, total);
}

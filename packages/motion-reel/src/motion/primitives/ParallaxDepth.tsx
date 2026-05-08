// ParallaxDepth — three z-layers that drift at different speeds, so
// the same static-text scene gets a feeling of depth and camera
// motion without anyone having to hand-author it. Background drifts
// slowest, midground medium, foreground fastest.
//
// The layers are passed in as children with an explicit z-index
// prop. Use it like:
//
//   <ParallaxDepth>
//     <ParallaxLayer depth="back">{decorative shapes}</ParallaxLayer>
//     <ParallaxLayer depth="mid">{accent rule + kicker}</ParallaxLayer>
//     <ParallaxLayer depth="front">{headline}</ParallaxLayer>
//   </ParallaxDepth>
//
// Drift direction is configurable (left/right/up/down) and
// continuous through the whole scene (no obvious loop point in a
// 3-6s scene).

"use client";

import { interpolate, useCurrentFrame } from "remotion";

type Direction = "left" | "right" | "up" | "down";
type Depth = "back" | "mid" | "front";

const SPEED_BY_DEPTH: Record<Depth, number> = {
  back: 0.4,
  mid: 1.0,
  front: 1.8,
};

type ParallaxDepthProps = {
  children: React.ReactNode;
  // Direction the layers drift. Default "left" — feels like a slow
  // dolly to the right.
  direction?: Direction;
  // Total drift in px (multiplied by per-depth speed). Default 60.
  amplitude?: number;
};

export const ParallaxDepth: React.FC<ParallaxDepthProps> = ({
  children,
  direction = "left",
  amplitude = 60,
}) => {
  // Pass direction + amplitude down via context-like props injection.
  // We avoid React Context to keep this component dependency-free
  // and Remotion-friendly.
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<ParallaxLayerProps>, {
          _direction: direction,
          _amplitude: amplitude,
        });
      })}
    </div>
  );
};

import * as React from "react";

type ParallaxLayerProps = {
  children: React.ReactNode;
  depth: Depth;
  // Injected by ParallaxDepth — don't set manually.
  _direction?: Direction;
  _amplitude?: number;
};

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  depth,
  _direction = "left",
  _amplitude = 60,
}) => {
  const frame = useCurrentFrame();
  const speed = SPEED_BY_DEPTH[depth];
  // Linear drift over the whole scene. Doesn't loop within typical
  // 3-6s scenes; long scenes still drift slowly enough that the
  // viewer doesn't notice the boundary.
  const driftPx = (frame / 30) * speed * _amplitude;

  let transform: string;
  switch (_direction) {
    case "left":
      transform = `translateX(${-driftPx}px)`;
      break;
    case "right":
      transform = `translateX(${driftPx}px)`;
      break;
    case "up":
      transform = `translateY(${-driftPx}px)`;
      break;
    case "down":
      transform = `translateY(${driftPx}px)`;
      break;
    default:
      transform = "none";
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
};

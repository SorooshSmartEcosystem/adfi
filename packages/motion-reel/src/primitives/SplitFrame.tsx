// SplitFrame — left/right two-column layout for any scene.
// Used to break the "everything centered" sameness of the current
// renderer. Common compositions: small label + giant value (40/60),
// two values side-by-side (50/50), label stack + accent block (60/40).
//
// Visual contract:
//   - Left and right are independently positioned absolutes; nothing
//     bleeds into the other side except optional `divider` styling.
//   - The split point is `leftRatio` (0..1, default 0.5).
//   - An optional `divider` (string color) draws a thin hairline
//     between the columns; `null` hides it.

import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

type Props = {
  left: ReactNode;
  right: ReactNode;
  leftRatio?: number;
  divider?: string | null;
  // When set, applies background tint per column. Useful for the
  // "half dark, half light" composition language.
  leftBg?: string | null;
  rightBg?: string | null;
  padding?: number;
};

export const SplitFrame: React.FC<Props> = ({
  left,
  right,
  leftRatio = 0.5,
  divider = null,
  leftBg = null,
  rightBg = null,
  padding = 56,
}) => {
  const leftPercent = `${Math.round(leftRatio * 100)}%`;
  const rightPercent = `${Math.round((1 - leftRatio) * 100)}%`;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: leftPercent,
          background: leftBg ?? "transparent",
          padding,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {left}
      </div>
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: rightPercent,
          background: rightBg ?? "transparent",
          padding,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {right}
      </div>
      {divider ? (
        <div
          style={{
            position: "absolute",
            left: leftPercent,
            top: padding,
            bottom: padding,
            width: 1,
            background: divider,
            transform: "translateX(-0.5px)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// OverlayFrame — wraps a hero element with a small floating badge in
// one of the four corners. Used to add a "this is a system, not a
// flat poster" feeling — the badge is the recurring brand motif
// across scenes (status label, scene number, brand mark).
//
// Visual contract:
//   - Children fill the frame; the badge is absolutely positioned
//     on top.
//   - Badge corners: tl / tr / bl / br with consistent inset.
//   - Badge has a subtle backdrop so it floats above any background.

import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export type Corner = "tl" | "tr" | "bl" | "br";

type Props = {
  children: ReactNode;
  badge: ReactNode;
  corner?: Corner;
  // Inset from the corner in px. Default 56 to match scene padding.
  inset?: number;
  // Glass behind the badge — subtle blur + tint. Pass `null` for none.
  badgeBackground?: string | null;
};

export const OverlayFrame: React.FC<Props> = ({
  children,
  badge,
  corner = "tl",
  inset = 56,
  badgeBackground = "rgba(255,255,255,0.06)",
}) => {
  const positionStyles: Record<Corner, React.CSSProperties> = {
    tl: { top: inset, left: inset },
    tr: { top: inset, right: inset },
    bl: { bottom: inset, left: inset },
    br: { bottom: inset, right: inset },
  };

  return (
    <AbsoluteFill>
      {children}
      <div
        style={{
          position: "absolute",
          ...positionStyles[corner],
          padding: badgeBackground ? "10px 16px" : 0,
          borderRadius: badgeBackground ? 999 : 0,
          background: badgeBackground ?? "transparent",
          backdropFilter: badgeBackground ? "blur(6px)" : undefined,
        }}
      >
        {badge}
      </div>
    </AbsoluteFill>
  );
};

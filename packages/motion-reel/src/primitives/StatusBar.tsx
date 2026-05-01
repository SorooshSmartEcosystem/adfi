// StatusBar — top-of-screen agent label + timestamp, mirroring the
// landing scenes' status-line at the top of the phone screen.
// e.g. "ECHO · DRAFTING            11:02AM"

import { useCurrentFrame, interpolate } from "remotion";

type Props = {
  // Left side: agent label + state. e.g. "ECHO · DRAFTING".
  label: string;
  // Right side: timestamp. e.g. "11:02AM".
  time?: string;
  // Frame at which the bar fades in. Default 0.
  startFrame?: number;
};

export function StatusBar({ label, time, startFrame = 0 }: Props) {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const opacity = interpolate(local, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 64px",
        height: 60,
        opacity,
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        fontSize: 18,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "rgba(102,102,102,0.85)",
      }}
    >
      <span>{label}</span>
      {time ? <span>{time}</span> : null}
    </div>
  );
}

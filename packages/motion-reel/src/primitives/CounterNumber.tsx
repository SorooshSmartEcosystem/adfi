// Counter — animates a number from 0 to its target value with an
// out-cubic easing curve so the count feels weighted (fast at the
// start, settles at the end).

import { useCurrentFrame, interpolate, Easing } from "remotion";

type Props = {
  // Target value. The counter eases from 0 → this.
  value: number;
  // When the count starts. Defaults to 0.
  startFrame?: number;
  // How long the count takes. Defaults to 30 frames (1s at 30fps).
  durationFrames?: number;
  // Format the number — default is whole-number with locale thousands
  // separators. Override for currency, decimals, etc.
  format?: (n: number) => string;
  // Optional prefix/suffix wrappers. Cheaper than a custom format fn
  // for the common "$" / "%" case.
  prefix?: string;
  suffix?: string;
  // Style overrides for the wrapping span.
  style?: React.CSSProperties;
};

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en-US");

export function CounterNumber({
  value,
  startFrame = 0,
  durationFrames = 30,
  format = defaultFormat,
  prefix = "",
  suffix = "",
  style,
}: Props) {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - startFrame);
  const eased = interpolate(localFrame, [0, durationFrames], [0, value], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <span style={style}>
      {prefix}
      {format(eased)}
      {suffix}
    </span>
  );
}

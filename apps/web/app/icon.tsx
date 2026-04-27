import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon — 64×64 background-stripped orb. Matches the brand-kit hero
// gradient stops (#5a5a5a → #2a2a2a → #0a0a0a → #000) at 30%/25% origin
// for the off-axis sphere look.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF7",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 52,
            height: 52,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 25%, #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%)",
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 11,
              left: 14,
              width: 14,
              height: 9,
              borderRadius: 999,
              background:
                "radial-gradient(ellipse, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.05) 55%, transparent 75%)",
              transform: "rotate(-25deg)",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}

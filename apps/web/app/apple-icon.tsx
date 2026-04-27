import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — 180×180. Same orb spec as the brand-kit hero with
// proportionally larger highlight + secondary glow so the depth shows up
// at home-screen render size.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF7",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 140,
            height: 140,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 25%, #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%)",
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 28,
              left: 36,
              width: 38,
              height: 26,
              borderRadius: 999,
              background:
                "radial-gradient(ellipse, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.05) 55%, transparent 75%)",
              transform: "rotate(-25deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 22,
              right: 28,
              width: 28,
              height: 18,
              borderRadius: 999,
              background:
                "radial-gradient(ellipse, rgba(255,255,255,0.10) 0%, transparent 70%)",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "adfi — an ai marketing team for solopreneurs";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#FAFAF7",
          color: "#111",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 25%, #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%)",
              display: "flex",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 7,
                left: 9,
                width: 10,
                height: 7,
                borderRadius: 999,
                background:
                  "radial-gradient(ellipse, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.05) 55%, transparent 75%)",
                transform: "rotate(-25deg)",
              }}
            />
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.5 }}>
            adfi
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 88,
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            <div style={{ display: "flex" }}>an ai marketing team</div>
            <div style={{ display: "flex" }}>for solopreneurs.</div>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#5b5b5b",
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            you hire it. it drafts the posts, books the calls, sends the
            newsletter. you stay focused on the work.
          </div>
        </div>

        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 16,
            letterSpacing: 2,
            color: "#888",
            textTransform: "uppercase",
          }}
        >
          adfi.ca · made for solopreneurs
        </div>
      </div>
    ),
    size,
  );
}

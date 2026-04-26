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
              width: 28,
              height: 28,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1a1a1a 60%, #000 100%)",
            }}
          />
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
              fontSize: 88,
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            an ai marketing team
            <br />
            for solopreneurs.
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

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

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
            width: 50,
            height: 50,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1a1a1a 60%, #000 100%)",
          }}
        />
      </div>
    ),
    size,
  );
}

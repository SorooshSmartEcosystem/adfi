import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ADFI",
    short_name: "adfi",
    description: "an ai marketing team for solopreneurs",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FAFAF7",
    theme_color: "#111111",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

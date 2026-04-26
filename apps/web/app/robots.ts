import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signin", "/signup", "/privacy", "/terms", "/cookies"],
        disallow: ["/dashboard", "/content", "/inbox", "/settings", "/specialist", "/onboarding", "/api/"],
      },
    ],
    sitemap: "https://www.adfi.ca/sitemap.xml",
  };
}

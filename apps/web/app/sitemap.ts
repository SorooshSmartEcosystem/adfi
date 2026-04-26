import type { MetadataRoute } from "next";

const BASE = "https://www.adfi.ca";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/`, lastModified, priority: 1 },
    { url: `${BASE}/signin`, lastModified, priority: 0.5 },
    { url: `${BASE}/signup`, lastModified, priority: 0.7 },
    { url: `${BASE}/privacy`, lastModified, priority: 0.3 },
    { url: `${BASE}/terms`, lastModified, priority: 0.3 },
    { url: `${BASE}/cookies`, lastModified, priority: 0.2 },
  ];
}

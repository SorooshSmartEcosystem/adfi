// SaaS / B2B preview — 20s, editorial + ink. Considered tone, no
// loud accents. Stat-driven story.

import type { Preview } from "./index";

export const saasPreview: Preview = {
  id: "preview-saas",
  name: "SaaS launch · 20s",
  tokens: {
    bg: "#FAFAF7",
    surface: "#F2EFE5",
    surface2: "#F8F5EA",
    border: "#E5E3DB",
    ink: "#0A0A0A",
    ink2: "#2D2D2D",
    ink3: "#5A5A5A",
    ink4: "#8A8A8A",
    alive: "#7CE896",
    aliveDark: "#3A9D5C",
    attnBg: "#FFF9ED",
    attnBorder: "#F0D98C",
    attnText: "#8A6A1E",
    businessName: "Lattice Inventory",
    markInner: undefined,
  },
  script: {
    scenes: [
      {
        type: "hook",
        headline: "v2.0",
        subtitle: "a year of rebuilding the inventory layer from the ground up.",
        duration: 4,
      },
      {
        type: "list",
        title: "what changed in v2",
        items: [
          {
            headline: "real-time syncing",
            body: "shopify, square, and quickbooks — same number, every device.",
          },
          {
            headline: "purchase order forecasting",
            body: "trained on 14 months of your actual sales data, not industry averages.",
          },
          {
            headline: "barcode scanning on web",
            body: "no app required. ipad camera + login is all you need.",
          },
        ],
        duration: 9,
      },
      {
        type: "punchline",
        line: "if you've outgrown your spreadsheet, this is built for you.",
        emphasis: "outgrown",
        duration: 4,
      },
      {
        type: "brand-stamp",
        cta: "free for 30 days · lattice.app/v2",
        duration: 3,
      },
    ],
    design: {
      style: "editorial",
      accent: "ink",
      pace: "slow",
      statusLabel: "PRODUCT UPDATE",
      hookLabel: "WHAT'S NEW",
      metaLabel: "DETAILS",
      closerLabel: "TRY IT",
    },
  },
};

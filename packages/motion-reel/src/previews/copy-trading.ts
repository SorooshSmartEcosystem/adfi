// Copy-trading / crypto preview — 20s, bold + attn. Originally the
// default PREVIEW_SCRIPT in Root.tsx; moved here so all industry
// samples live in one directory.

import type { Preview } from "./index";

export const copyTradingPreview: Preview = {
  id: "preview-copy-trading",
  name: "Copy trading · 20s",
  tokens: {
    bg: "#0F0F12",
    surface: "#1C1C22",
    surface2: "#252530",
    border: "#2D2D38",
    ink: "#F5F5F7",
    ink2: "#D6D6DC",
    ink3: "#9C9CA8",
    ink4: "#666674",
    alive: "#5DD09B",
    aliveDark: "#2D9C6D",
    attnBg: "#3D2A0E",
    attnBorder: "#E8B85A",
    attnText: "#F5C97D",
    businessName: "TradeStream",
    markInner: undefined,
  },
  script: {
    scenes: [
      {
        type: "hook",
        headline: "51%",
        subtitle: "of copy traders finished 2025 in profit.",
        duration: 3,
      },
      {
        type: "contrast",
        leftLabel: "WITH PEER FEEDS",
        leftValue: "51%",
        rightLabel: "SOLO RETAIL",
        rightValue: "20%",
        caption: "the gap is the conversation.",
        duration: 4,
      },
      {
        type: "quote",
        quote:
          "this isn't a pitch for blind copying. it's the case for trading next to someone whose entries, invalidations, and stop-outs are on the record.",
        duration: 6,
      },
      {
        type: "stat",
        value: 70,
        suffix: "%",
        label: "USED PEER INSIGHTS IN 2024",
        duration: 3,
      },
      {
        type: "punchline",
        line: "the edge was never the secret indicator. it was the feed.",
        emphasis: "feed",
        duration: 4,
      },
      {
        type: "brand-stamp",
        cta: "DM 'feed' for who's worth following",
        duration: 3,
      },
    ],
    design: {
      style: "bold",
      accent: "attn",
      pace: "medium",
      statusLabel: "TODAY'S NOTE",
      hookLabel: "WHY IT MATTERS",
      metaLabel: "BACKSTORY",
      closerLabel: "FOLLOW",
    },
  },
};

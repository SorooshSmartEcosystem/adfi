// Fitness coach preview — 22s, bold + urgent. Punchy stats, contrast
// scenes, fast pace. Brand voice is direct, no-bs.

import type { Preview } from "./index";

export const fitnessPreview: Preview = {
  id: "preview-fitness",
  name: "Fitness coach · 22s",
  tokens: {
    bg: "#0A0A0A",
    surface: "#1A1A1A",
    surface2: "#222",
    border: "#2A2A2A",
    ink: "#FFFFFF",
    ink2: "#E5E5E5",
    ink3: "#A3A3A3",
    ink4: "#737373",
    alive: "#A3E635",
    aliveDark: "#65A30D",
    attnBg: "#451A03",
    attnBorder: "#EA580C",
    attnText: "#FB923C",
    businessName: "Forge Athletics",
    markInner: undefined,
  },
  script: {
    scenes: [
      {
        type: "hook",
        headline: "WEEK 1",
        subtitle: "you'll hate me. week 6, you'll thank me.",
        duration: 3,
      },
      {
        type: "contrast",
        leftLabel: "DAY 1",
        leftValue: "0%",
        rightLabel: "DAY 90",
        rightValue: "+18%",
        caption: "average muscle mass gain on the 12-week protocol.",
        duration: 4,
      },
      {
        type: "stat",
        value: 312,
        suffix: " athletes",
        label: "TRAINED IN 2025",
        duration: 3,
      },
      {
        type: "punchline",
        line: "results aren't an accident. they're a system.",
        emphasis: "system",
        duration: 4,
      },
      {
        type: "hashtags",
        hashtags: ["fitness", "strengthtraining", "12weekprogram", "forge"],
        caption: "next intake closes friday.",
        duration: 3,
      },
      {
        type: "brand-stamp",
        cta: "DM 'forge' to apply",
        duration: 5,
      },
    ],
    design: {
      style: "bold",
      accent: "urgent",
      pace: "fast",
      statusLabel: "TODAY'S MISSION",
      hookLabel: "REAL TALK",
      metaLabel: "THE NUMBERS",
      closerLabel: "APPLY NOW",
    },
  },
};

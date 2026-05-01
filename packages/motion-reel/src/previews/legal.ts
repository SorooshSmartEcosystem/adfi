// Tax / legal preview — 18s, minimal + ink. Restrained palette, no
// loud accents. Voice is precise, calm. The opposite of fitness.

import type { Preview } from "./index";

export const legalPreview: Preview = {
  id: "preview-legal",
  name: "Tax accountant · 18s",
  tokens: {
    bg: "#FAFAF7",
    surface: "#F2EFE5",
    surface2: "#F8F5EA",
    border: "#E5E3DB",
    ink: "#0F0F0F",
    ink2: "#3A3A3A",
    ink3: "#666666",
    ink4: "#999999",
    alive: "#7CE896",
    aliveDark: "#3A9D5C",
    attnBg: "#FFF9ED",
    attnBorder: "#F0D98C",
    attnText: "#8A6A1E",
    businessName: "Halton Tax Group",
    markInner: undefined,
  },
  script: {
    scenes: [
      {
        type: "hook",
        headline: "APRIL 30",
        subtitle: "the deadline most filers will miss this year.",
        duration: 4,
      },
      {
        type: "stat",
        value: "$4.8B",
        label: "IN UNCLAIMED CRA REFUNDS",
        duration: 4,
      },
      {
        type: "list",
        title: "three filings worth a second look",
        items: [
          {
            headline: "rrsp deduction carryforward",
            body: "underused — most people deduct in the wrong year.",
          },
          {
            headline: "self-employment expense gaps",
            body: "home office + vehicle, calculated correctly.",
          },
          {
            headline: "medical expense pooling",
            body: "between spouses; the lower-income one usually wins.",
          },
        ],
        duration: 8,
      },
      {
        type: "punchline",
        line: "the difference between an okay return and a good one is who reads the line items.",
        emphasis: "who reads",
        duration: 5,
      },
      {
        type: "brand-stamp",
        cta: "book a free 15-min review · halton.tax",
        duration: 4,
      },
    ],
    design: {
      style: "minimal",
      accent: "ink",
      pace: "slow",
      statusLabel: "QUIET REMINDER",
      hookLabel: "WHY IT MATTERS",
      metaLabel: "WHAT TO CHECK",
      closerLabel: "REVIEW",
    },
  },
};

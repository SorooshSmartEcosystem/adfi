// Renovation company preview — 50s script, warm + bold blend.
// Audience: homeowners deciding between contractors. Hook with a
// before/after stat, walk through the case, end with a "book a
// walkthrough" CTA.
//
// Style: warm — these brands trade on craftsmanship + trust, so
// amber accents over cream feel right.
// Pace: medium — 50s gives room for the case, ListScene takes 8s,
// rest are ~5s each.

import type { Preview } from "./index";

export const renovationPreview: Preview = {
  id: "preview-renovation",
  name: "Renovation · 50s",
  tokens: {
    bg: "#FAF7F0",
    surface: "#F0EAD9",
    surface2: "#F8F3E5",
    border: "#E5DFC8",
    ink: "#1F1A12",
    ink2: "#3F362A",
    ink3: "#6A5C44",
    ink4: "#998970",
    alive: "#9DC08B",
    aliveDark: "#5C7E47",
    attnBg: "#FAEBC8",
    attnBorder: "#D9A21C",
    attnText: "#7A5A0F",
    businessName: "north fork builds",
    // Optional inline mark (a simple monogram) — replaced at runtime
    // with the real BrandKit logoTemplates.mark in production.
    markInner: undefined,
  },
  script: {
    scenes: [
      {
        type: "hook",
        headline: "1986",
        subtitle: "the year this house was built. we just gave it back to her.",
        duration: 4,
      },
      {
        type: "stat",
        value: 247,
        suffix: " days",
        label: "FROM TEAR-OUT TO MOVE-IN",
        duration: 4,
      },
      {
        type: "contrast",
        leftLabel: "BEFORE",
        leftValue: "1980s",
        rightLabel: "AFTER",
        rightValue: "TIMELESS",
        caption: "we don't follow trends. we restore character.",
        duration: 5,
      },
      {
        type: "quote",
        quote:
          "the bones were good. the kitchen wasn't. we kept what mattered and rebuilt the rest in white oak.",
        attribution: "lead carpenter, james",
        duration: 7,
      },
      {
        type: "list",
        title: "three things every reno needs",
        items: [
          {
            headline: "honest scope",
            body: "no surprise change-orders mid-project. you get the price you signed for.",
          },
          {
            headline: "single point of contact",
            body: "one foreman, your phone, every weekday.",
          },
          {
            headline: "a finish line",
            body: "we hit move-in dates within 5 days, 94% of the time.",
          },
        ],
        duration: 12,
      },
      {
        type: "stat",
        value: "94%",
        label: "ON-TIME COMPLETION",
        duration: 4,
      },
      {
        type: "punchline",
        line: "good renovations don't take longer. they take the right team.",
        emphasis: "right team",
        duration: 5,
      },
      {
        type: "hashtags",
        hashtags: [
          "renovation",
          "homerenovation",
          "kitchenremodel",
          "customcarpentry",
          "buildbetter",
        ],
        caption: "see the full walkthrough on our profile.",
        duration: 4,
      },
      {
        type: "brand-stamp",
        cta: "book a walkthrough · link in bio",
        duration: 5,
      },
    ],
    design: {
      style: "warm",
      accent: "attn",
      pace: "medium",
      statusLabel: "FROM THE JOB SITE",
      hookLabel: "WHY WE CARE",
      metaLabel: "OUR PROCESS",
      closerLabel: "BOOK NOW",
    },
  },
};

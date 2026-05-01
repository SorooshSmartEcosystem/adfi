// Restaurant / food preview — 25s, warm. Sensory voice; talks about
// ingredients, technique, the room.

import type { Preview } from "./index";

export const restaurantPreview: Preview = {
  id: "preview-restaurant",
  name: "Restaurant · 25s",
  tokens: {
    bg: "#FBF6EE",
    surface: "#F2E9D6",
    surface2: "#F8F1E1",
    border: "#E8DDC2",
    ink: "#1F1612",
    ink2: "#3F2E26",
    ink3: "#6F5A4E",
    ink4: "#9B8475",
    alive: "#D9A24E",
    aliveDark: "#A8762D",
    attnBg: "#FAEBC8",
    attnBorder: "#D9A21C",
    attnText: "#7A5A0F",
    businessName: "Nove Trattoria",
    markInner: undefined,
  },
  script: {
    scenes: [
      {
        type: "hook",
        headline: "9 PM",
        subtitle: "when the kitchen finally exhales.",
        duration: 4,
      },
      {
        type: "quote",
        quote:
          "we make pasta the way our nonna did. 00 flour, two eggs, ten minutes of kneading. the only shortcut is more practice.",
        attribution: "chef giulia",
        duration: 7,
      },
      {
        type: "stat",
        value: 86,
        suffix: " covers",
        label: "EVERY FRIDAY NIGHT",
        duration: 4,
      },
      {
        type: "punchline",
        line: "the bookings open monday. they'll close by tuesday lunch.",
        emphasis: "by tuesday",
        duration: 5,
      },
      {
        type: "hashtags",
        hashtags: ["pasta", "italianfood", "torontoeats", "trattoria", "nove"],
        duration: 3,
      },
      {
        type: "brand-stamp",
        cta: "reservations · nove.ca",
        duration: 2,
      },
    ],
    design: {
      style: "warm",
      accent: "alive",
      pace: "medium",
      statusLabel: "FROM THE PASS",
      hookLabel: "TONIGHT",
      metaLabel: "WHO WE ARE",
      closerLabel: "BOOK NOW",
    },
  },
};

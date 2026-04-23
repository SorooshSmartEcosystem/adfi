// @ts-check

// Token values mirror packages/ui/src/tokens.ts (the source of truth).
// Duplicated here because Tailwind loads preset files via CJS without a
// TypeScript loader in scope, so we cannot require("../src/tokens.ts").
// When editing: update tokens.ts first, then reflect changes here.

/** @type {Partial<import('tailwindcss').Config>} */
const preset = {
  theme: {
    extend: {
      colors: {
        bg: "#FAFAF7",
        ink: "#111",
        ink2: "#666",
        ink3: "#888",
        ink4: "#999",
        surface: "#F2EFE5",
        border: "#E5E3DB",
        border2: "#EEEBE0",
        alive: "#7CE896",
        aliveDark: "#3a9d5c",
        attentionBg: "#FFF9ED",
        attentionBorder: "#F0D98C",
        attentionText: "#8a6a1e",
        urgent: "#C84A3E",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
      },
      fontFamily: {
        sans: ["SF Pro Text", "Inter", "system-ui"],
        mono: ["SF Mono", "JetBrains Mono", "monospace"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
      },
      fontSize: {
        xs: "11px",
        sm: "12px",
        base: "14px",
        md: "15px",
        lg: "17px",
        xl: "19px",
        "2xl": "23px",
        "3xl": "28px",
        "4xl": "36px",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "14px",
        xl: "20px",
        "2xl": "24px",
        full: "9999px",
      },
      borderWidth: {
        hairline: "0.5px",
        regular: "1px",
        emphasis: "1.5px",
      },
    },
  },
};

module.exports = { preset };

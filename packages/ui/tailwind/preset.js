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
        ink2: "#444",
        ink3: "#666",
        ink4: "#888",
        ink5: "#999",
        surface: "#F2EFE5",
        surface2: "#F8F5EA",
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
        xs: "13px",
        sm: "14px",
        base: "17px",
        md: "18px",
        lg: "20px",
        xl: "23px",
        "2xl": "28px",
        "3xl": "34px",
        "4xl": "43px",
        "5xl": "53px",
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

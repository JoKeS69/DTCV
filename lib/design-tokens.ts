/**
 * CASE//NET design tokens — command-deck HUD.
 * Source of truth: media/desktop.jpeg + media/mobileversion.jpeg
 */

export const designTokens = {
  brand: "CASE//NET",
  tagline: "GLOBAL INVESTIGATION PLATFORM",
  manifesto: ["REAL CASES.", "REAL PEOPLE.", "REAL IMPACT."] as const,
  colors: {
    bg: "#050505",
    surface: "#0a0a0a",
    surfaceElevated: "#14181c",
    border: "#2a2e33",
    borderStrong: "#3a4048",
    text: "#e6e8ea",
    textMuted: "#9aa3ad",
    textDim: "#5c646e",
    cta: "#8a99ad",
    ctaText: "#08090a",
    online: "#4ade80",
    amber: "#f5a524",
    unsolved: "#7d8fa3",
    closed: "#c4c8cc",
    danger: "#b33a3a",
    selected: "#272d33",
  },
  fonts: {
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
  },
} as const;

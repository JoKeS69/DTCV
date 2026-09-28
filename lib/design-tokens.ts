/**
 * DETECTIVE design tokens — cinematic investigative HUD.
 * Brand: DETECTIVE (not CASE//NET). Refs: media/design-refs/*.jpg
 */

export const designTokens = {
  brand: "DETECTIVE",
  tagline: "GLOBAL INVESTIGATION PLATFORM",
  manifesto: ["REAL CASES.", "REAL PEOPLE.", "REAL IMPACT."] as const,
  colors: {
    bg: "#050607",
    surface: "#0a0c0f",
    surfaceElevated: "#101319",
    border: "#1c1f26",
    borderStrong: "#2a303a",
    text: "#e8eaed",
    textMuted: "#8b929e",
    textDim: "#5a6170",
    cta: "#8a99ad",
    ctaText: "#08090a",
    online: "#22c55e",
    amber: "#f59e0b",
    danger: "#b33a3a",
  },
  fonts: {
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
  },
} as const;

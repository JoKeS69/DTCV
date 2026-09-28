/**
 * DETECTIVE design token placeholders (Phase 0).
 * Visual system is applied in Phase 1 — these document the target aesthetic:
 * dark, sophisticated, minimal, cinematic, serious, premium.
 *
 * Design references: /cursor/stores/.../media/design-refs/{dashboard,login,mobile}.jpg
 */

export const designTokens = {
  brand: "DETECTIVE",
  colors: {
    bg: "#07080a",
    surface: "#0e1014",
    surfaceElevated: "#151820",
    border: "#1e232c",
    text: "#e8eaed",
    textMuted: "#8b929e",
    accent: "#c9a227",
    accentDim: "#8a7020",
    danger: "#b33a3a",
    success: "#2f6f4e",
  },
  fonts: {
    display: "var(--font-display)",
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
  },
} as const;

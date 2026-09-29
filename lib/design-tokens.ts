/**
 * CASE//NET spacious design tokens.
 * Visual identity preserved; spacing/type hierarchy raised.
 */

export const designTokens = {
  brand: "CASE//NET",
  tagline: "GLOBAL INVESTIGATION PLATFORM",
  manifesto: ["REAL CASES.", "REAL PEOPLE.", "REAL IMPACT."] as const,
  colors: {
    bg: "#07090B",
    surface: "#0D1114",
    surfaceElevated: "#12171B",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.14)",
    text: "#E6EDF3",
    textMuted: "#8B98A5",
    textDim: "#5C6A76",
    cta: "#8a99ad",
    ctaText: "#08090a",
    online: "#4ade80",
    amber: "#f5a524",
    unsolved: "#7d8fa3",
    closed: "#c4c8cc",
    danger: "#b33a3a",
    selected: "#1A2228",
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
  },
  panelPad: { desktop: 24, mobile: 16 },
  gap: { panel: 16, section: 24 },
  type: {
    min: 12,
    body: 14,
    title: 18,
    titleLg: 20,
    stat: 44,
    inputMobile: 16,
  },
  radius: {
    panel: 8,
    control: 6,
    pill: 999,
  },
  sidebar: {
    full: 252,
    rail: 72,
  },
  systemBar: 36,
  bottomNav: 64,
  rowHeight: 54,
  fonts: {
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
  },
} as const;

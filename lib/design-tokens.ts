/**
 * CASE//NET design tokens — elevated command deck.
 * Cool steel + teal atmosphere; no purple glow / cream-serif clichés.
 */

export const designTokens = {
  brand: "CASE//NET",
  tagline: "GLOBAL INVESTIGATION PLATFORM",
  manifesto: ["REAL CASES.", "REAL PEOPLE.", "REAL IMPACT."] as const,
  colors: {
    bg: "#06080A",
    surface: "#0C1014",
    surfaceElevated: "#121820",
    border: "rgba(255,255,255,0.09)",
    borderStrong: "rgba(255,255,255,0.16)",
    text: "#E8EEF4",
    textMuted: "#8B9AAB",
    textDim: "#5A6A78",
    cta: "#8FA0B5",
    ctaText: "#07090B",
    online: "#4ADE80",
    accent: "#5EC4B6",
    amber: "#F5A524",
    unsolved: "#7D8FA3",
    closed: "#C4C8CC",
    danger: "#B33A3A",
    selected: "#1A242C",
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
  gap: { panel: 20, section: 28 },
  type: {
    min: 12,
    body: 14,
    title: 18,
    titleLg: 22,
    display: 36,
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
    display: "var(--font-display)",
  },
} as const;

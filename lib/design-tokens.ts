/**
 * CASE//NET design tokens — THE CASE ARCHIVE / high-tech noir
 * (visual system from Figma board; product IA unchanged).
 */

export const designTokens = {
  brand: "CASE//NET",
  tagline: "GLOBAL CASE ARCHIVE",
  manifesto: ["REAL CASES.", "REAL PEOPLE.", "REAL IMPACT."] as const,
  headline: "EVERY CASE LEAVES A TRACE",
  colors: {
    bg: "#080A0C",
    surface: "#0C1014",
    surfaceElevated: "#12181F",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.16)",
    text: "#F2F5F7",
    textMuted: "#8B9AAB",
    textDim: "#5A6A78",
    /** Primary CTA — solid white (Figma) */
    cta: "#F5F7FA",
    ctaText: "#080A0C",
    online: "#34D399",
    /** Cyan accent — active nav, links, cold status, map nodes */
    accent: "#3ECFCF",
    amber: "#F5A524",
    unsolved: "#7D8FA3",
    closed: "#A7B0B8",
    danger: "#E5484D",
    selected: "#0E1A1C",
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
    panel: 4,
    control: 2,
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

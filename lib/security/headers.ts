/**
 * Baseline security response headers.
 * CSP with nonces is applied dynamically in middleware (see middleware.ts).
 * Static headers here omit CSP to avoid conflicting with nonce CSP.
 */

export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
] as const;

/**
 * Build CSP. Prefer nonces for scripts.
 * Residual: style-src keeps 'unsafe-inline' for Next/Tailwind runtime styles
 * until a full nonce/hash style pipeline lands (documented in SECURITY.md).
 * Dev-only: script-src includes 'unsafe-eval' for React/Next debugging (not prod).
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    // Esri World Dark Gray Base tiles for GLOBAL CASES (Leaflet)
    "img-src 'self' data: blob: https://server.arcgisonline.com https://services.arcgisonline.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

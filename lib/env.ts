/**
 * Environment variable contract for DETECTIVE.
 * Secrets never belong in git — use `.env.local` locally and Vercel env vars in deploy.
 *
 * Phase 0: DATABASE_URL (+ optional NEXT_PUBLIC_SITE_URL).
 * Later phases will extend this (auth, Stripe, AI, etc.).
 */

export const envKeys = {
  databaseUrl: "DATABASE_URL",
  siteUrl: "NEXT_PUBLIC_SITE_URL",
} as const;

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

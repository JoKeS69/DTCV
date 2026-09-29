import { getSiteUrl } from "@/lib/env";

export const SITE_NAME = "DETECTIVE";
export const SITE_TAGLINE = "Global investigation platform";
export const DEFAULT_DESCRIPTION =
  "DETECTIVE — sourced real-case files, community discussion, and fictional training investigations. No guilt declarations. Citations required.";

/** Absolute public URL for a path (leading slash optional). */
export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl().replace(/\/$/, "");
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Truncate plain text for meta descriptions. */
export function metaDescription(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

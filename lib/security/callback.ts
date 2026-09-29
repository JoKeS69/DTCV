/** Safe same-origin relative redirect path (blocks //evil open redirects). */
export function safeCallbackPath(
  raw: string | null | undefined,
  fallback = "/profile",
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  // Must be a single-root relative path: /foo — not //host, /\, or protocol-relative.
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;
  if (!/^\/[A-Za-z0-9/_\-.?=&%]*$/.test(value)) return fallback;
  return value;
}

/** Dev-only: expose reset/verify links when email provider is a placeholder. */
export function allowDevAuthLinks(): boolean {
  const placeholder = process.env.AUTH_EMAIL_PLACEHOLDER?.trim() === "true";
  const prod =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  return placeholder && !prod;
}

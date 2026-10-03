/** Values that may appear after Prisma/JSON/`unstable_cache` round-trips. */
export type DateLike = Date | string | number;

/**
 * Coerce Prisma/JSON/`unstable_cache` timestamps to a valid Date.
 * Returns null for nullish or invalid input (never throws).
 */
export function coerceDate(value: DateLike | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format Date, ISO string, or epoch ms (`unstable_cache` serializes Dates to strings). */
export function formatDateTime(
  value: DateLike | null | undefined,
  fallback = "—",
): string {
  const d = coerceDate(value);
  if (!d) return value == null ? fallback : String(value);
  return d.toISOString();
}

export function formatDateOnly(
  value: DateLike | null | undefined,
  fallback = "—",
): string {
  const iso = formatDateTime(value, "");
  if (!iso) return fallback;
  return iso.slice(0, 10);
}

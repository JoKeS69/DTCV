/** Format Date or ISO string (unstable_cache serializes Dates to strings). */
export function formatDateTime(
  value: Date | string | null | undefined,
  fallback = "—",
): string {
  if (value == null) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

export function formatDateOnly(
  value: Date | string | null | undefined,
  fallback = "—",
): string {
  const iso = formatDateTime(value, "");
  if (!iso) return fallback;
  return iso.slice(0, 10);
}

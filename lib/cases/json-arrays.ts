/** Normalize Prisma Json fields that store string arrays (SQLite has no String[]). */
export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return asStringArray(parsed);
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  return [];
}

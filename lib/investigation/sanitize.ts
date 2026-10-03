/** Sanitize Investigation Mode user input (length + control chars). */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizePlayerText(
  input: unknown,
  maxLen: number,
): string {
  const raw = typeof input === "string" ? input : String(input ?? "");
  return raw.replace(CONTROL, "").replace(/\s+/g, " ").trim().slice(0, maxLen);
}

export function sanitizeDisplayName(input: unknown): string {
  const name = sanitizePlayerText(input, 40);
  if (name.length < 2) return "";
  return name;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

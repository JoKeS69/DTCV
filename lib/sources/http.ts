import { createHash } from "node:crypto";

const USER_AGENT =
  process.env.CASE_SYNC_USER_AGENT?.trim() ||
  "DETECTIVE-CASE-NET/1.0 (+https://github.com/JoKeS69/detectives; case-sync)";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stableHash(value: unknown): string {
  const json = JSON.stringify(value);
  return createHash("sha256").update(json).digest("hex");
}

export function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length ? t : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asString(v))
    .filter((v): v is string => Boolean(v));
}

export function stripHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length ? text : null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Fetch JSON with UA, timeout, and exponential backoff (max 3 retries).
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  {
    timeoutMs = 25_000,
    maxRetries = 3,
    init,
  }: {
    timeoutMs?: number;
    maxRetries?: number;
    init?: RequestInit;
  } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `HTTP ${res.status} for ${url}${body ? `: ${body.slice(0, 200)}` : ""}`,
        );
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      const delay = Math.min(8_000, 500 * 2 ** attempt);
      await sleep(delay);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`fetch failed for ${url}`);
}

/**
 * In-memory sliding-window limiter keyed by IP.
 *
 * On Vercel this is per-instance (not a global store). That is enough to blunt
 * casual spam on a personal contact form without adding Upstash. If volume
 * grows, swap the Map for @upstash/ratelimit against Redis.
 */
type Bucket = number[];

const windows = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

function prune(now: number, stamps: Bucket): Bucket {
  return stamps.filter((t) => now - t < WINDOW_MS);
}

export function rateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const next = prune(now, windows.get(key) ?? []);

  if (next.length >= MAX_REQUESTS) {
    const oldest = next[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    windows.set(key, next);
    return { ok: false, retryAfterSec };
  }

  next.push(now);
  windows.set(key, next);
  return { ok: true };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

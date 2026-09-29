/**
 * Simple in-memory sliding-window rate limiter for community posts.
 * Process-local — enough for Phase 5 anti-spam; swap for Redis later if needed.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function rateLimit(
  key: string,
  {
    limit,
    windowMs,
  }: {
    limit: number;
    windowMs: number;
  },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}

/** Community write budgets (per user). */
export const COMMUNITY_LIMITS = {
  discussion: { limit: 5, windowMs: 10 * 60 * 1000 },
  comment: { limit: 30, windowMs: 10 * 60 * 1000 },
  report: { limit: 10, windowMs: 10 * 60 * 1000 },
  reaction: { limit: 60, windowMs: 10 * 60 * 1000 },
} as const;

/** Auth / payment abuse budgets (process-local). */
export const AUTH_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

export const WEBHOOK_LIMITS = {
  ip: { limit: 120, windowMs: 60 * 1000 },
} as const;

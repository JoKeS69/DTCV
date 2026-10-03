/** Rate limits for trial start + checkout (per user). */
export const BILLING_LIMITS = {
  trial: { limit: 5, windowMs: 60 * 60 * 1000 },
  checkout: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;

/** Pending Whish payments older than this are marked expired by the cron. */
export const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;

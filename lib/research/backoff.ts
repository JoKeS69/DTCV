/**
 * Exponential backoff for provider 429 / timeout errors.
 * Never logs secrets.
 */

export class RetryableProviderError extends Error {
  readonly status?: number;
  readonly retryable: boolean;

  constructor(message: string, opts?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = "RetryableProviderError";
    this.status = opts?.status;
    this.retryable = opts?.retryable ?? true;
  }
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof RetryableProviderError) return err.retryable;
  if (!err || typeof err !== "object") return false;
  const anyErr = err as {
    status?: number;
    code?: string;
    message?: string;
    name?: string;
  };
  if (anyErr.status === 429 || anyErr.status === 408) return true;
  if (anyErr.status !== undefined && anyErr.status >= 500) return true;
  const msg = `${anyErr.code ?? ""} ${anyErr.message ?? ""} ${anyErr.name ?? ""}`.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("etimedout") ||
    msg.includes("econnreset") ||
    msg.includes("rate limit") ||
    msg.includes("429")
  );
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseMs = 400,
    maxMs = 8_000,
  }: { retries?: number; baseMs?: number; maxMs?: number } = {},
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (attempt >= retries || !isRetryableError(err)) throw err;
      const delay = Math.min(maxMs, baseMs * 2 ** attempt);
      const jitter = Math.floor(Math.random() * (delay * 0.2));
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }
  throw last;
}

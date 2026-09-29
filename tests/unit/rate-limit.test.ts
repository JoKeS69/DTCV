import { afterEach, describe, expect, it, vi } from "vitest";
import {
  networkRateKey,
  rateLimit,
  userRateKey,
} from "@/lib/rate-limit";

describe("rateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows under the limit and blocks when exceeded", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    expect(rateLimit(key, { limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit(key, { limit: 2, windowMs: 60_000 }).ok).toBe(true);
    const blocked = rateLimit(key, { limit: 2, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("network keys HMAC the IP and do not embed raw IP", () => {
    vi.stubEnv("AUTH_SECRET", "unit-test-auth-secret-with-enough-length");
    const key = networkRateKey("auth:login", "203.0.113.50");
    expect(key.startsWith("auth:login:n:")).toBe(true);
    expect(key).not.toContain("203.0.113.50");
    expect(key).not.toContain("203");
  });

  it("prefers user-scoped keys for authenticated budgets", () => {
    expect(userRateKey("discussion", "user_abc")).toBe("discussion:u:user_abc");
  });

  it("forbids E2E bypass in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_TEST", "1");
    vi.stubEnv("DISABLE_RATE_LIMIT", "1");
    const key = `prod-bypass:${Date.now()}:${Math.random()}`;
    expect(rateLimit(key, { limit: 1, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit(key, { limit: 1, windowMs: 60_000 }).ok).toBe(false);
  });
});

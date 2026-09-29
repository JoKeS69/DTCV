import { afterEach, describe, expect, it, vi } from "vitest";

describe("payments config", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    vi.resetModules();
  });

  it("fail-closes when webhook secret is missing", async () => {
    delete process.env.PAYMENTS_WEBHOOK_SECRET;
    const { getWebhookSecret } = await import("@/lib/payments/config");
    expect(() => getWebhookSecret()).toThrow(/required/i);
  });

  it("rejects placeholder webhook secrets", async () => {
    process.env.PAYMENTS_WEBHOOK_SECRET =
      "replace-with-a-long-random-webhook-secret";
    const { getWebhookSecret } = await import("@/lib/payments/config");
    expect(() => getWebhookSecret()).toThrow(/placeholder/i);
  });

  it("forbids dev_visa in live mode", async () => {
    process.env.PAYMENTS_MODE = "live";
    process.env.PAYMENTS_PROVIDER = "dev_visa";
    const { getActiveProviderId } = await import("@/lib/payments/config");
    expect(() => getActiveProviderId()).toThrow(/forbidden/i);
  });
});

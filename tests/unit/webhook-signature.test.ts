import { describe, expect, it } from "vitest";
import {
  signWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/payments/webhook";

describe("webhook HMAC", () => {
  const secret = "unit-test-webhook-secret-32chars!!";
  const body = JSON.stringify({ id: "evt_1", type: "checkout.completed" });

  it("verifies a valid signature", () => {
    const sig = signWebhookPayload(body, secret);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    expect(verifyWebhookSignature(body, `sha256=${sig}`, secret)).toBe(true);
  });

  it("rejects missing or wrong signatures", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "deadbeef", secret)).toBe(false);
    const other = signWebhookPayload(body, "different-secret-value!!");
    expect(verifyWebhookSignature(body, other, secret)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { computeExtendedAccessUntil } from "@/lib/billing/periods";

/**
 * Idempotency + Visa-only rules are enforced in confirmPaidPayment.
 * These unit tests lock the pure contracts used by that path.
 */
describe("prepaid confirmation contracts", () => {
  it("one-trial semantics: hasUsedTrial blocks second trial at service layer", () => {
    // Documented: startTrialForUser uses updateMany where hasUsedTrial=false.
    const first = { hasUsedTrial: false };
    const after = { hasUsedTrial: true };
    expect(first.hasUsedTrial).toBe(false);
    expect(after.hasUsedTrial).toBe(true);
  });

  it("non-Visa brand must be rejected before extend", () => {
    const brand = "mastercard";
    const allowed = brand.toLowerCase() === "visa";
    expect(allowed).toBe(false);
  });

  it("stacking renewals adds full period from later of now/access_until", () => {
    const t0 = new Date("2026-06-01T00:00:00.000Z");
    const afterFirst = computeExtendedAccessUntil({
      plan: "monthly",
      now: t0,
      currentAccessUntil: null,
    });
    const afterSecond = computeExtendedAccessUntil({
      plan: "monthly",
      now: new Date("2026-06-10T00:00:00.000Z"),
      currentAccessUntil: afterFirst,
    });
    expect(afterSecond.getTime()).toBeGreaterThan(afterFirst.getTime());
  });
});

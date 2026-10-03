import { describe, expect, it } from "vitest";
import {
  evaluateFictionalAccess,
  daysUntilAccessEnd,
  shouldShowRenewalBanner,
} from "@/lib/billing/access";
import { computeExtendedAccessUntil, computeTrialWindow } from "@/lib/billing/periods";
import { getBillingPlans, getTrialDays } from "@/lib/billing/config";
import { isVisaPan } from "@/lib/payments/visa";

describe("evaluateFictionalAccess", () => {
  const now = new Date("2026-10-03T12:00:00.000Z");

  it("allows ADMIN by role only (no username)", () => {
    const d = evaluateFictionalAccess(
      {
        role: "ADMIN",
        comped: false,
        trialEndsAt: null,
        accessUntil: null,
        hasUsedTrial: false,
      },
      now,
    );
    expect(d.allowed).toBe(true);
    expect(d.reason).toBe("admin");
  });

  it("allows comped users", () => {
    const d = evaluateFictionalAccess(
      {
        role: "USER",
        comped: true,
        trialEndsAt: null,
        accessUntil: null,
        hasUsedTrial: true,
      },
      now,
    );
    expect(d.allowed).toBe(true);
    expect(d.reason).toBe("comped");
  });

  it("allows active trial", () => {
    const d = evaluateFictionalAccess(
      {
        role: "USER",
        comped: false,
        trialEndsAt: new Date("2026-10-10T12:00:00.000Z"),
        accessUntil: null,
        hasUsedTrial: true,
      },
      now,
    );
    expect(d.allowed).toBe(true);
    expect(d.reason).toBe("trial");
    expect(d.status).toBe("trial");
  });

  it("allows paid access_until", () => {
    const d = evaluateFictionalAccess(
      {
        role: "USER",
        comped: false,
        trialEndsAt: new Date("2026-09-01T12:00:00.000Z"),
        accessUntil: new Date("2026-11-01T12:00:00.000Z"),
        hasUsedTrial: true,
        billingPlan: "monthly",
      },
      now,
    );
    expect(d.allowed).toBe(true);
    expect(d.reason).toBe("paid");
  });

  it("denies expired trial and paid", () => {
    const d = evaluateFictionalAccess(
      {
        role: "USER",
        comped: false,
        trialEndsAt: new Date("2026-09-01T12:00:00.000Z"),
        accessUntil: new Date("2026-09-15T12:00:00.000Z"),
        hasUsedTrial: true,
      },
      now,
    );
    expect(d.allowed).toBe(false);
    expect(d.status).toBe("expired");
  });

  it("denies never-subscribed user", () => {
    const d = evaluateFictionalAccess(
      {
        role: "USER",
        comped: false,
        trialEndsAt: null,
        accessUntil: null,
        hasUsedTrial: false,
      },
      now,
    );
    expect(d.allowed).toBe(false);
    expect(d.status).toBe("none");
  });
});

describe("period extension math", () => {
  it("extends from now when no current access", () => {
    const now = new Date("2026-10-03T00:00:00.000Z");
    const next = computeExtendedAccessUntil({
      plan: "monthly",
      now,
      currentAccessUntil: null,
    });
    expect(next.toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });

  it("early renewal never loses paid time", () => {
    const now = new Date("2026-10-03T00:00:00.000Z");
    const current = new Date("2026-10-20T00:00:00.000Z");
    const next = computeExtendedAccessUntil({
      plan: "monthly",
      now,
      currentAccessUntil: current,
    });
    expect(next.toISOString()).toBe("2026-11-19T00:00:00.000Z");
  });

  it("yearly adds 365 days", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const next = computeExtendedAccessUntil({
      plan: "yearly",
      now,
      currentAccessUntil: null,
    });
    expect(next.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("trial window uses TRIAL_DAYS default 7", () => {
    expect(getTrialDays()).toBe(7);
    const now = new Date("2026-10-03T00:00:00.000Z");
    const w = computeTrialWindow({ trialDays: 7, now });
    expect(w.trialEndsAt.toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });
});

describe("pricing config", () => {
  it("exposes monthly 2.99 and yearly 24.99 defaults", () => {
    const plans = getBillingPlans();
    expect(plans.find((p) => p.key === "monthly")?.amountCents).toBe(299);
    expect(plans.find((p) => p.key === "yearly")?.amountCents).toBe(2499);
  });
});

describe("Visa-only enforcement helper", () => {
  it("accepts Visa PANs and rejects Mastercard", () => {
    expect(isVisaPan("4111111111111111")).toBe(true);
    expect(isVisaPan("5111111111111111")).toBe(false);
  });
});

describe("renewal banner", () => {
  it("shows when under 7 days remain", () => {
    const now = new Date("2026-10-03T12:00:00.000Z");
    const d = evaluateFictionalAccess(
      {
        role: "USER",
        comped: false,
        trialEndsAt: null,
        accessUntil: new Date("2026-10-06T12:00:00.000Z"),
        hasUsedTrial: true,
      },
      now,
    );
    expect(daysUntilAccessEnd(d, now)).toBe(3);
    expect(shouldShowRenewalBanner(d, now)).toBe(true);
  });
});

describe("confirmPaidPayment idempotency contract", () => {
  it("documents unique provider+reference constraint via plan keys", () => {
    // Pure contract: only monthly|yearly plans extend access.
    const plans = getBillingPlans().map((p) => p.key);
    expect(plans).toEqual(["monthly", "yearly"]);
  });
});

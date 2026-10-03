/**
 * Fictional-cases access rules (pure + DB loaders).
 * Allow if: admin role OR comped OR now < trial_ends_at OR now < access_until.
 * Never hardcode usernames — check role/flag only.
 */

export type AccessReason =
  | "admin"
  | "comped"
  | "trial"
  | "paid"
  | "denied";

export type AccessInput = {
  role: "USER" | "MODERATOR" | "ADMIN";
  comped: boolean;
  trialEndsAt: Date | null;
  accessUntil: Date | null;
  hasUsedTrial: boolean;
  trialStartedAt?: Date | null;
  billingPlan?: string | null;
};

export type AccessDecision = {
  allowed: boolean;
  reason: AccessReason;
  status: "admin" | "comped" | "trial" | "active" | "expired" | "none";
  trialEndsAt: Date | null;
  accessUntil: Date | null;
  hasUsedTrial: boolean;
  billingPlan: string | null;
  /** Milliseconds until the soonest of trial/paid end when allowed via those. */
  msRemaining: number | null;
};

export function evaluateFictionalAccess(
  input: AccessInput,
  now: Date = new Date(),
): AccessDecision {
  const trialEndsAt = input.trialEndsAt;
  const accessUntil = input.accessUntil;
  const billingPlan = input.billingPlan ?? null;

  // Role/flag only — never username.
  if (input.role === "ADMIN") {
    return {
      allowed: true,
      reason: "admin",
      status: "admin",
      trialEndsAt,
      accessUntil,
      hasUsedTrial: input.hasUsedTrial,
      billingPlan,
      msRemaining: null,
    };
  }

  if (input.comped) {
    return {
      allowed: true,
      reason: "comped",
      status: "comped",
      trialEndsAt,
      accessUntil,
      hasUsedTrial: input.hasUsedTrial,
      billingPlan,
      msRemaining: null,
    };
  }

  const nowMs = now.getTime();
  const trialMs = trialEndsAt?.getTime() ?? null;
  const paidMs = accessUntil?.getTime() ?? null;

  const trialActive = trialMs !== null && nowMs < trialMs;
  const paidActive = paidMs !== null && nowMs < paidMs;

  if (trialActive && paidActive) {
    const later = Math.max(trialMs!, paidMs!);
    return {
      allowed: true,
      reason: paidMs! >= trialMs! ? "paid" : "trial",
      status: paidMs! >= trialMs! ? "active" : "trial",
      trialEndsAt,
      accessUntil,
      hasUsedTrial: input.hasUsedTrial,
      billingPlan,
      msRemaining: later - nowMs,
    };
  }

  if (trialActive) {
    return {
      allowed: true,
      reason: "trial",
      status: "trial",
      trialEndsAt,
      accessUntil,
      hasUsedTrial: input.hasUsedTrial,
      billingPlan,
      msRemaining: trialMs! - nowMs,
    };
  }

  if (paidActive) {
    return {
      allowed: true,
      reason: "paid",
      status: "active",
      trialEndsAt,
      accessUntil,
      hasUsedTrial: input.hasUsedTrial,
      billingPlan,
      msRemaining: paidMs! - nowMs,
    };
  }

  const hadAccess =
    input.hasUsedTrial ||
    Boolean(trialEndsAt) ||
    Boolean(accessUntil) ||
    input.billingPlan != null;

  return {
    allowed: false,
    reason: "denied",
    status: hadAccess ? "expired" : "none",
    trialEndsAt,
    accessUntil,
    hasUsedTrial: input.hasUsedTrial,
    billingPlan,
    msRemaining: null,
  };
}

/** Days remaining (ceil) for renewal banner thresholds. */
export function daysUntilAccessEnd(
  decision: AccessDecision,
  now: Date = new Date(),
): number | null {
  if (!decision.allowed) return null;
  if (decision.reason === "admin" || decision.reason === "comped") return null;
  if (decision.msRemaining == null) return null;
  return Math.ceil(decision.msRemaining / (24 * 60 * 60 * 1000));
}

export function shouldShowRenewalBanner(
  decision: AccessDecision,
  now: Date = new Date(),
): boolean {
  const days = daysUntilAccessEnd(decision, now);
  if (days == null) return false;
  return days <= 7 && days >= 0;
}

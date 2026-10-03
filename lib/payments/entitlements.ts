import { getPrisma } from "@/lib/db";
import type { FictionalDifficulty } from "@/lib/generated/prisma/client";
import { loadAccessDecision } from "@/lib/billing/service";
import { evaluateFictionalAccess } from "@/lib/billing/access";

export type EntitlementSnapshot = {
  plan: "FREE" | "PREMIUM";
  status: "FREE" | "ACTIVE" | "CANCELED" | "PAST_DUE";
  isPremium: boolean;
  /** True when trial/paid/comped/admin grants Fictional cases access. */
  hasFictionalAccess: boolean;
  label: string;
  currentPeriodEnd: Date | null;
  accessUntil: Date | null;
  trialEndsAt: Date | null;
  hasUsedTrial: boolean;
  cancelAtPeriodEnd: boolean;
  paymentCustomerId: string | null;
  paymentSubscriptionId: string | null;
};

export function planLabel(plan: "FREE" | "PREMIUM") {
  return plan === "PREMIUM" ? "Investigator Pro" : "Free";
}

export function isPremiumActive(input: {
  subscriptionPlan: "FREE" | "PREMIUM";
  subscriptionStatus: "FREE" | "ACTIVE" | "CANCELED" | "PAST_DUE";
}): boolean {
  // ACTIVE only — cancel-at-period-end keeps ACTIVE until the webhook flips to FREE.
  return (
    input.subscriptionPlan === "PREMIUM" && input.subscriptionStatus === "ACTIVE"
  );
}

/**
 * All fictional / Investigation Mode content requires trial or paid access.
 * Difficulty-based Pro gate retired in favor of the prepaid/trial model.
 */
export function fictionalRequiresPremium(_difficulty?: FictionalDifficulty) {
  return true;
}

export async function getUserEntitlements(
  userId: string,
): Promise<EntitlementSnapshot | null> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      subscriptionCancelAtPeriodEnd: true,
      paymentCustomerId: true,
      paymentSubscriptionId: true,
      accessUntil: true,
      trialEndsAt: true,
      hasUsedTrial: true,
      comped: true,
      billingPlan: true,
    },
  });
  if (!user) return null;

  const access = evaluateFictionalAccess({
    role: user.role,
    comped: user.comped,
    trialEndsAt: user.trialEndsAt,
    accessUntil: user.accessUntil,
    hasUsedTrial: user.hasUsedTrial,
    billingPlan: user.billingPlan,
  });

  const isPremium =
    access.allowed ||
    isPremiumActive({
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
    });

  return {
    plan: isPremium ? "PREMIUM" : user.subscriptionPlan,
    status: access.allowed
      ? "ACTIVE"
      : user.subscriptionStatus,
    isPremium,
    hasFictionalAccess: access.allowed,
    label: access.allowed
      ? access.status === "trial"
        ? "Free trial"
        : access.status === "comped"
          ? "Comped access"
          : access.status === "admin"
            ? "Admin"
            : "Fictional access"
      : planLabel(user.subscriptionPlan),
    currentPeriodEnd:
      user.accessUntil ?? user.subscriptionCurrentPeriodEnd,
    accessUntil: user.accessUntil,
    trialEndsAt: user.trialEndsAt,
    hasUsedTrial: user.hasUsedTrial,
    cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
    paymentCustomerId: user.paymentCustomerId,
    paymentSubscriptionId: user.paymentSubscriptionId,
  };
}

export async function requirePremium(userId: string): Promise<
  | { ok: true; entitlements: EntitlementSnapshot }
  | { ok: false; error: string }
> {
  const entitlements = await getUserEntitlements(userId);
  if (!entitlements) return { ok: false, error: "Sign in required" };
  if (!entitlements.hasFictionalAccess && !entitlements.isPremium) {
    return { ok: false, error: "Fictional access required" };
  }
  return { ok: true, entitlements };
}

/** Prefer this for Fictional / Investigation Mode gates. */
export async function requireFictionalEntitlement(userId: string) {
  const decision = await loadAccessDecision(userId);
  if (!decision) return { ok: false as const, error: "Sign in required" };
  if (!decision.allowed) {
    return {
      ok: false as const,
      error: "Fictional cases require a free trial or paid access",
    };
  }
  return { ok: true as const, decision };
}

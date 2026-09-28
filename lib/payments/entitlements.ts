import { getPrisma } from "@/lib/db";
import type { FictionalDifficulty } from "@/lib/generated/prisma/client";

export type EntitlementSnapshot = {
  plan: "FREE" | "PREMIUM";
  status: "FREE" | "ACTIVE" | "CANCELED" | "PAST_DUE";
  isPremium: boolean;
  label: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  paymentCustomerId: string | null;
  paymentSubscriptionId: string | null;
};

const PREMIUM_DIFFICULTIES: FictionalDifficulty[] = ["ADVANCED", "EXPERT"];

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

/** ADVANCED/EXPERT fictional files require Investigator Pro. */
export function fictionalRequiresPremium(difficulty: FictionalDifficulty) {
  return PREMIUM_DIFFICULTIES.includes(difficulty);
}

export async function getUserEntitlements(
  userId: string,
): Promise<EntitlementSnapshot | null> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      subscriptionCancelAtPeriodEnd: true,
      paymentCustomerId: true,
      paymentSubscriptionId: true,
    },
  });
  if (!user) return null;

  const isPremium = isPremiumActive(user);
  return {
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
    isPremium,
    label: planLabel(user.subscriptionPlan),
    currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
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
  if (!entitlements.isPremium) {
    return { ok: false, error: "Investigator Pro required" };
  }
  return { ok: true, entitlements };
}

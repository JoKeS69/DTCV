import type { BillingPlanKey } from "@/lib/billing/config";
import { getBillingPlan } from "@/lib/billing/config";

/**
 * Extend access_until by 1 month or 1 year from the later of now and current access_until.
 * Early renewals never lose paid time.
 */
export function computeExtendedAccessUntil(input: {
  plan: BillingPlanKey;
  now?: Date;
  currentAccessUntil?: Date | null;
}): Date {
  const now = input.now ?? new Date();
  const plan = getBillingPlan(input.plan);
  const base =
    input.currentAccessUntil && input.currentAccessUntil.getTime() > now.getTime()
      ? input.currentAccessUntil
      : now;
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + plan.intervalDays);
  return next;
}

export function computeTrialWindow(input: {
  trialDays: number;
  now?: Date;
}): { trialStartedAt: Date; trialEndsAt: Date } {
  const now = input.now ?? new Date();
  const trialEndsAt = new Date(now.getTime());
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + input.trialDays);
  return { trialStartedAt: now, trialEndsAt };
}

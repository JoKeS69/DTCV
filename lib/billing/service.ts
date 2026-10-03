import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db";
import {
  evaluateFictionalAccess,
  type AccessDecision,
} from "@/lib/billing/access";
import {
  getTrialDays,
  type BillingPlanKey,
} from "@/lib/billing/config";
import { computeTrialWindow } from "@/lib/billing/periods";
import { hasValidConsent, consentCookieNames } from "@/lib/legal/consent";

const ACCESS_SELECT = {
  role: true,
  comped: true,
  trialStartedAt: true,
  trialEndsAt: true,
  hasUsedTrial: true,
  accessUntil: true,
  billingPlan: true,
  cardAutoRenew: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
  subscriptionCurrentPeriodEnd: true,
} as const;

export async function loadAccessDecision(
  userId: string,
  now: Date = new Date(),
): Promise<AccessDecision | null> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: ACCESS_SELECT,
  });
  if (!user) return null;
  return evaluateFictionalAccess(
    {
      role: user.role,
      comped: user.comped,
      trialEndsAt: user.trialEndsAt,
      accessUntil: user.accessUntil,
      hasUsedTrial: user.hasUsedTrial,
      trialStartedAt: user.trialStartedAt,
      billingPlan: user.billingPlan,
    },
    now,
  );
}

export async function requireTermsAccepted(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const jar = await cookies();
  const { VISITOR_COOKIE } = consentCookieNames();
  const visitorKey = jar.get(VISITOR_COOKIE)?.value;
  const ok = await hasValidConsent(visitorKey);
  if (!ok) {
    return {
      ok: false,
      error: "Accept the Terms before starting a trial or payment",
    };
  }
  return { ok: true };
}

export async function startTrialForUser(userId: string): Promise<
  | { ok: true; trialEndsAt: Date }
  | { ok: false; error: string }
> {
  const terms = await requireTermsAccepted();
  if (!terms.ok) return terms;

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hasUsedTrial: true,
      role: true,
      emailBlindIndex: true,
    },
  });
  if (!user) return { ok: false, error: "User not found" };
  if (user.role === "ADMIN") {
    return { ok: false, error: "Admins do not need a trial" };
  }
  if (user.hasUsedTrial) {
    return { ok: false, error: "Free trial already used on this account" };
  }

  // One trial per verified email blind-index when present (blocks simple re-signup).
  if (user.emailBlindIndex) {
    const duplicate = await prisma.user.findFirst({
      where: {
        emailBlindIndex: user.emailBlindIndex,
        hasUsedTrial: true,
        NOT: { id: userId },
      },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "A free trial was already used with this email",
      };
    }
  }

  const { trialStartedAt, trialEndsAt } = computeTrialWindow({
    trialDays: getTrialDays(),
  });

  const updated = await prisma.user.updateMany({
    where: { id: userId, hasUsedTrial: false },
    data: {
      hasUsedTrial: true,
      trialStartedAt,
      trialEndsAt,
    },
  });
  if (updated.count === 0) {
    return { ok: false, error: "Free trial already used on this account" };
  }

  return { ok: true, trialEndsAt };
}

export async function listUserPayments(userId: string) {
  return getPrisma().payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      provider: true,
      providerReference: true,
      plan: true,
      amountCents: true,
      currency: true,
      status: true,
      createdAt: true,
      paidAt: true,
      cardBrand: true,
    },
  });
}

export type BillingStatusPayload = {
  allowed: boolean;
  status: AccessDecision["status"];
  reason: AccessDecision["reason"];
  trialEndsAt: string | null;
  accessUntil: string | null;
  hasUsedTrial: boolean;
  billingPlan: string | null;
  cardAutoRenew: boolean;
  daysRemaining: number | null;
  canStartTrial: boolean;
  plans: { key: BillingPlanKey; label: string; amountCents: number; currency: string }[];
};

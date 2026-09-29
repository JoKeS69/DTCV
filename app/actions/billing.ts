"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPaymentProvider } from "@/lib/payments";
import { getPrisma } from "@/lib/db";
import { requireActiveUser } from "@/lib/server/authz";

export type BillingActionResult =
  | { ok: true; url?: string }
  | { ok: false; error: string };

export async function startInvestigatorProCheckout(): Promise<BillingActionResult> {
  const gate = await requireActiveUser();
  if (!gate.ok || !gate.user.email) {
    return { ok: false, error: "Sign in required" };
  }

  const entitlements = await getPrisma().user.findUnique({
    where: { id: gate.user.id },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });
  if (
    entitlements?.subscriptionPlan === "PREMIUM" &&
    entitlements.subscriptionStatus === "ACTIVE"
  ) {
    return { ok: false, error: "Already on Investigator Pro" };
  }

  try {
    const provider = getPaymentProvider();
    const session = await provider.createCheckout({
      userId: gate.user.id,
      email: gate.user.email,
      planKey: "investigator_pro",
      // Prefer relative paths so auth cookies survive localhost ↔ 127.0.0.1.
      successUrl: `/billing?checkout=success`,
      cancelUrl: `/pricing?checkout=canceled`,
    });
    redirect(session.checkoutUrl);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not start checkout",
    };
  }
}

export async function confirmVisaCheckout(input: {
  sessionId: string;
  pan: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  cardholderName: string;
}): Promise<BillingActionResult> {
  const gate = await requireActiveUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const provider = getPaymentProvider();
  const result = await provider.confirmCheckout({
    sessionId: input.sessionId,
    userId: gate.user.id,
    card: {
      pan: input.pan,
      expMonth: input.expMonth,
      expYear: input.expYear,
      cvc: input.cvc,
      cardholderName: input.cardholderName,
    },
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/billing");
  revalidatePath("/pricing");
  revalidatePath("/profile");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/fictional");
  redirect("/billing?checkout=success");
}

export async function openBillingPortal(): Promise<BillingActionResult> {
  const gate = await requireActiveUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const row = await getPrisma().user.findUnique({
    where: { id: gate.user.id },
    select: { paymentCustomerId: true },
  });
  const provider = getPaymentProvider();
  const portal = await provider.createPortal({
    userId: gate.user.id,
    customerId: row?.paymentCustomerId ?? null,
    returnUrl: `/billing`,
  });
  redirect(portal.url);
}

export async function cancelSubscriptionAction(
  immediate = false,
): Promise<BillingActionResult> {
  const gate = await requireActiveUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const row = await getPrisma().user.findUnique({
    where: { id: gate.user.id },
    select: { paymentSubscriptionId: true },
  });
  if (!row?.paymentSubscriptionId) {
    return { ok: false, error: "No active subscription" };
  }

  const provider = getPaymentProvider();
  const result = await provider.cancelSubscription({
    userId: gate.user.id,
    subscriptionId: row.paymentSubscriptionId,
    atPeriodEnd: !immediate,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/billing");
  revalidatePath("/pricing");
  revalidatePath("/profile");
  revalidatePath("/admin/subscriptions");
  return { ok: true };
}

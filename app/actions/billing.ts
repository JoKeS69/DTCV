"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPaymentProvider } from "@/lib/payments";
import { getPrisma } from "@/lib/db";
import { requireActiveUser } from "@/lib/server/authz";
import { startBillingCheckout } from "@/lib/billing/checkout";
import { confirmPaidPayment } from "@/lib/billing/confirm";
import { startTrialForUser } from "@/lib/billing/service";
import { isVisaPan, digitsOnly } from "@/lib/payments/visa";
import { rateLimit, userRateKey } from "@/lib/rate-limit";
import { BILLING_LIMITS } from "@/lib/billing/limits";

export type BillingActionResult =
  | { ok: true; url?: string }
  | { ok: false; error: string };

/** @deprecated Prefer startPrepaidCheckout — kept for older pricing UI. */
export async function startInvestigatorProCheckout(): Promise<BillingActionResult> {
  return startPrepaidCheckout({ plan: "monthly", method: "card" });
}

export async function startPrepaidCheckout(input: {
  plan: "monthly" | "yearly";
  method: "card" | "whish";
}): Promise<BillingActionResult> {
  const gate = await requireActiveUser();
  if (!gate.ok) {
    return { ok: false, error: "Sign in required" };
  }

  const limited = rateLimit(
    userRateKey("billing-checkout", gate.user.id),
    BILLING_LIMITS.checkout,
  );
  if (!limited.ok) {
    return {
      ok: false,
      error: `Rate limited — retry in ${limited.retryAfterSec}s`,
    };
  }

  try {
    const result = await startBillingCheckout({
      userId: gate.user.id,
      email: gate.user.email,
      plan: input.plan,
      method: input.method,
    });
    if (!result.ok) return result;
    redirect(result.redirectUrl);
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

export async function startFreeTrialAction(): Promise<BillingActionResult> {
  const gate = await requireActiveUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const limited = rateLimit(
    userRateKey("billing-trial", gate.user.id),
    BILLING_LIMITS.trial,
  );
  if (!limited.ok) {
    return {
      ok: false,
      error: `Rate limited — retry in ${limited.retryAfterSec}s`,
    };
  }

  const result = await startTrialForUser(gate.user.id);
  if (!result.ok) return result;

  revalidatePath("/billing");
  revalidatePath("/billing/paywall");
  revalidatePath("/fictional");
  revalidatePath("/pricing");
  redirect("/fictional");
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

  const pan = digitsOnly(input.pan);
  if (!isVisaPan(pan)) {
    return { ok: false, error: "Only Visa cards are accepted" };
  }

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

  // Extend prepaid access_until for linked Payment (idempotent).
  const payment = await getPrisma().payment.findFirst({
    where: {
      provider: "card",
      checkoutSessionId: input.sessionId,
      userId: gate.user.id,
    },
  });
  if (payment) {
    const confirmed = await confirmPaidPayment({
      provider: "card",
      providerReference: payment.providerReference,
      cardBrand: "visa",
    });
    if (!confirmed.ok && confirmed.refundRequired) {
      return { ok: false, error: confirmed.error };
    }
  }

  revalidatePath("/billing");
  revalidatePath("/billing/paywall");
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

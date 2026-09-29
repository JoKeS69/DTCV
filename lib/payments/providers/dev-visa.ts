import { getPrisma } from "@/lib/db";
import {
  getPlanByKey,
  getWebhookSecret,
} from "@/lib/payments/config";
import type {
  ConfirmCheckoutInput,
  ConfirmCheckoutResult,
  CheckoutCreateInput,
  CheckoutCreateResult,
  NormalizedWebhookEvent,
  PaymentProvider,
  PortalResult,
} from "@/lib/payments/types";
import {
  digitsOnly,
  isDevVisaDeclinePan,
  isDevVisaSuccessPan,
  isVisaPan,
  luhnValid,
  maskPan,
} from "@/lib/payments/visa";
import {
  applyWebhookEvent,
  signWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/payments/webhook";

function expiryValid(expMonth: string, expYear: string): boolean {
  const month = Number(expMonth);
  const yearRaw = Number(expYear);
  if (!Number.isFinite(month) || month < 1 || month > 12) return false;
  if (!Number.isFinite(yearRaw)) return false;
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const now = new Date();
  const exp = new Date(year, month, 0, 23, 59, 59);
  return exp.getTime() >= now.getTime();
}

/**
 * Test/dev Visa provider — clearly labeled.
 * Completes a fake Visa checkout and applies HMAC-signed webhook events.
 */
export const devVisaProvider: PaymentProvider = {
  id: "dev_visa",

  async createCheckout(input: CheckoutCreateInput): Promise<CheckoutCreateResult> {
    const plan = getPlanByKey(input.planKey);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const session = await getPrisma().checkoutSession.create({
      data: {
        userId: input.userId,
        planKey: plan.key,
        amountCents: plan.amountCents,
        currency: plan.currency,
        status: "OPEN",
        provider: "dev_visa",
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        expiresAt,
      },
    });

    return {
      sessionId: session.id,
      // Relative URL keeps the auth cookie host (localhost vs 127.0.0.1).
      checkoutUrl: `/checkout/${session.id}`,
      provider: "dev_visa",
    };
  },

  async confirmCheckout(
    input: ConfirmCheckoutInput,
  ): Promise<ConfirmCheckoutResult> {
    const prisma = getPrisma();
    const session = await prisma.checkoutSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session || session.userId !== input.userId) {
      return { ok: false, error: "Checkout session not found" };
    }
    if (session.status !== "OPEN") {
      return { ok: false, error: "Checkout session is not open" };
    }
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.checkoutSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
      return { ok: false, error: "Checkout session expired" };
    }

    const pan = digitsOnly(input.card.pan);
    if (!isVisaPan(pan) || !luhnValid(pan)) {
      return { ok: false, error: "Enter a valid Visa card number" };
    }
    if (isDevVisaDeclinePan(pan)) {
      return { ok: false, error: "Card declined (test decline PAN)" };
    }
    if (!expiryValid(input.card.expMonth, input.card.expYear)) {
      return { ok: false, error: "Card expiration invalid" };
    }
    if (!/^\d{3,4}$/.test(input.card.cvc.trim())) {
      return { ok: false, error: "CVC invalid" };
    }
    if (input.card.cardholderName.trim().length < 2) {
      return { ok: false, error: "Cardholder name required" };
    }

    // Test mode: only documented success PANs grant Pro (not any Luhn-valid Visa).
    if (!isDevVisaSuccessPan(pan)) {
      return {
        ok: false,
        error:
          "Use a documented test Visa PAN (e.g. 4111111111111111). Arbitrary cards are rejected.",
      };
    }

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) return { ok: false, error: "User not found" };

    const customerId =
      user.paymentCustomerId ?? `cus_dev_${user.id.slice(0, 12)}`;
    const subscriptionId = `sub_dev_${session.id.slice(0, 16)}`;
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        providerRef: subscriptionId,
      },
    });

    const event: NormalizedWebhookEvent = {
      id: `evt_dev_${session.id}`,
      type: "checkout.completed",
      provider: "dev_visa",
      userId: user.id,
      customerId,
      subscriptionId,
      planKey: "investigator_pro",
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      raw: {
        sessionId: session.id,
        panMask: maskPan(pan),
        amountCents: session.amountCents,
        currency: session.currency,
      },
    };

    const body = JSON.stringify(event);
    const sig = signWebhookPayload(body, getWebhookSecret());
    if (!verifyWebhookSignature(body, sig)) {
      return { ok: false, error: "Internal webhook signature failed" };
    }
    await applyWebhookEvent(event);

    return { ok: true, subscriptionId, customerId };
  },

  async createPortal(): Promise<PortalResult> {
    return { url: `/billing` };
  },

  async cancelSubscription(input) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user?.paymentSubscriptionId) {
      return { ok: false, error: "No active subscription" };
    }
    if (user.paymentSubscriptionId !== input.subscriptionId) {
      return { ok: false, error: "Subscription mismatch" };
    }

    if (input.atPeriodEnd) {
      const event: NormalizedWebhookEvent = {
        id: `evt_dev_cancel_sched_${user.id}_${Date.now()}`,
        type: "subscription.updated",
        provider: "dev_visa",
        userId: user.id,
        customerId: user.paymentCustomerId ?? undefined,
        subscriptionId: user.paymentSubscriptionId,
        planKey: "investigator_pro",
        currentPeriodEnd:
          user.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: true,
        raw: { atPeriodEnd: true },
      };
      await applyWebhookEvent(event);
      return { ok: true };
    }

    const event: NormalizedWebhookEvent = {
      id: `evt_dev_cancel_${user.id}_${Date.now()}`,
      type: "subscription.canceled",
      provider: "dev_visa",
      userId: user.id,
      customerId: user.paymentCustomerId ?? undefined,
      subscriptionId: user.paymentSubscriptionId,
      planKey: "free",
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      raw: { immediate: true },
    };
    await applyWebhookEvent(event);
    return { ok: true };
  },

  async verifyAndParseWebhook(rawBody, signatureHeader) {
    if (!verifyWebhookSignature(rawBody, signatureHeader)) {
      throw new Error("Invalid webhook signature");
    }
    const parsed = JSON.parse(rawBody) as NormalizedWebhookEvent;
    if (!parsed.id || !parsed.type) {
      throw new Error("Invalid webhook payload");
    }
    return parsed;
  },
};

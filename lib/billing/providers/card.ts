import { getPrisma } from "@/lib/db";
import type {
  BillingProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentResult,
} from "@/lib/billing/types";
import { getPaymentProvider } from "@/lib/payments";

/**
 * Visa card provider — reuses existing Visa PaymentProvider abstraction.
 * Brand is enforced at confirm time (PAN must be Visa; reject non-Visa).
 * No Stripe (owner preference).
 */
export const cardBillingProvider: BillingProvider = {
  id: "card",

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!input.user.email) {
      return { ok: false, error: "Verified email required for card checkout" };
    }

    const prisma = getPrisma();
    const payment = await prisma.payment.findUnique({
      where: { id: input.paymentId },
    });
    if (!payment || payment.provider !== "card") {
      return { ok: false, error: "Card payment record not found" };
    }

    try {
      const visa = getPaymentProvider();
      const session = await visa.createCheckout({
        userId: input.user.id,
        email: input.user.email,
        planKey: "investigator_pro",
        successUrl: input.successReturnUrl,
        cancelUrl: input.failureReturnUrl,
      });

      await prisma.checkoutSession.update({
        where: { id: session.sessionId },
        data: {
          planKey: payment.plan,
          amountCents: payment.amountCents,
          currency: payment.currency,
          providerRef: input.providerReference,
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          checkoutSessionId: session.sessionId,
          providerReference: input.providerReference,
        },
      });

      return {
        ok: true,
        // Prefer relative checkout URL so auth cookies survive localhost host variants.
        redirectUrl: session.checkoutUrl.startsWith("http")
          ? session.checkoutUrl
          : session.checkoutUrl,
        providerReference: input.providerReference,
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not start Visa checkout",
      };
    }
  },

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const payment = await getPrisma().payment.findFirst({
      where: { provider: "card", providerReference: reference },
    });
    if (!payment) return { ok: false, error: "Payment not found" };
    if (payment.status === "paid") {
      return {
        ok: true,
        status: "paid",
        cardBrand: payment.cardBrand ?? "visa",
        providerReference: reference,
        amountCents: payment.amountCents,
        currency: payment.currency,
      };
    }
    if (payment.status === "failed" || payment.status === "refunded") {
      return {
        ok: true,
        status: "failed",
        cardBrand: payment.cardBrand,
        providerReference: reference,
      };
    }
    return {
      ok: true,
      status: "pending",
      cardBrand: payment.cardBrand,
      providerReference: reference,
    };
  },
};

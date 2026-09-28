import { getPrisma } from "@/lib/db";
import {
  getPlanByKey,
  getSiteUrl,
  visaGatewayConfigured,
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
import { verifyWebhookSignature } from "@/lib/payments/webhook";

/**
 * Live Visa-accepting gateway adapter (CyberSource-shaped REST).
 * Requires VISA_GATEWAY_* secrets. When unset, factory falls back to dev_visa.
 *
 * Hosted checkout: we create a local CheckoutSession and hand off to the
 * gateway authorize URL when credentials exist. Card data is never stored.
 */
export const visaGatewayProvider: PaymentProvider = {
  id: "visa_gateway",

  async createCheckout(input: CheckoutCreateInput): Promise<CheckoutCreateResult> {
    if (!visaGatewayConfigured()) {
      throw new Error(
        "Visa gateway not configured. Set VISA_GATEWAY_MERCHANT_ID, VISA_GATEWAY_API_KEY_ID, VISA_GATEWAY_API_SECRET.",
      );
    }

    const plan = getPlanByKey(input.planKey);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const session = await getPrisma().checkoutSession.create({
      data: {
        userId: input.userId,
        planKey: plan.key,
        amountCents: plan.amountCents,
        currency: plan.currency,
        status: "OPEN",
        provider: "visa_gateway",
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        expiresAt,
      },
    });

    const base =
      process.env.VISA_GATEWAY_BASE_URL?.trim() ||
      "https://apitest.cybersource.com";

    // Hosted handoff placeholder — real integration posts a JWT/session to
    // Microform / Secure Acceptance. Until merchant credentials are live,
    // route through our Visa capture page which refuses non-test PANs in live mode.
    void base;
    return {
      sessionId: session.id,
      checkoutUrl: `${getSiteUrl()}/checkout/${session.id}?provider=visa_gateway`,
      provider: "visa_gateway",
    };
  },

  async confirmCheckout(
    input: ConfirmCheckoutInput,
  ): Promise<ConfirmCheckoutResult> {
    void input;
    if (!visaGatewayConfigured()) {
      return {
        ok: false,
        error:
          "Visa gateway keys missing. Use PAYMENTS_MODE=test / provider=dev_visa for local checkout.",
      };
    }
    // Card PAN must not hit our servers in production — use gateway hosted fields.
    return {
      ok: false,
      error:
        "Live Visa capture uses gateway hosted fields. Complete checkout on the provider-hosted page, then wait for the signed webhook.",
    };
  },

  async createPortal(input): Promise<PortalResult> {
    return {
      url: `${getSiteUrl()}/billing?provider=visa_gateway&customer=${encodeURIComponent(input.customerId ?? "")}`,
    };
  },

  async cancelSubscription(input) {
    if (!visaGatewayConfigured()) {
      return { ok: false, error: "Visa gateway not configured" };
    }
    // Mark cancel-at-period-end locally; live cancel API call would go here.
    await getPrisma().user.update({
      where: { id: input.userId },
      data: {
        subscriptionCancelAtPeriodEnd: input.atPeriodEnd,
        ...(input.atPeriodEnd
          ? {}
          : {
              subscriptionPlan: "FREE" as const,
              subscriptionStatus: "CANCELED" as const,
              paymentSubscriptionId: null,
            }),
      },
    });
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
    return { ...parsed, provider: parsed.provider || "visa_gateway" };
  },
};

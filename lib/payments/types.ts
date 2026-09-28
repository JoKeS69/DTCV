import type { PlanKey } from "@/lib/payments/config";

export type VisaCardInput = {
  /** Digits only or spaced — Visa PANs start with 4 */
  pan: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  cardholderName: string;
};

export type CheckoutCreateInput = {
  userId: string;
  email: string;
  planKey: Extract<PlanKey, "investigator_pro">;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutCreateResult = {
  sessionId: string;
  /** URL to present Visa checkout (local form or hosted gateway). */
  checkoutUrl: string;
  provider: string;
};

export type ConfirmCheckoutInput = {
  sessionId: string;
  userId: string;
  card: VisaCardInput;
};

export type ConfirmCheckoutResult =
  | { ok: true; subscriptionId: string; customerId: string }
  | { ok: false; error: string };

export type PortalResult = {
  /** Local manage page or hosted portal URL */
  url: string;
};

export type NormalizedWebhookEvent = {
  id: string;
  type:
    | "checkout.completed"
    | "subscription.updated"
    | "subscription.canceled"
    | "subscription.past_due";
  provider: string;
  userId?: string;
  customerId?: string;
  subscriptionId?: string;
  planKey?: PlanKey;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  raw: unknown;
};

export interface PaymentProvider {
  readonly id: string;
  createCheckout(input: CheckoutCreateInput): Promise<CheckoutCreateResult>;
  confirmCheckout(input: ConfirmCheckoutInput): Promise<ConfirmCheckoutResult>;
  createPortal(input: {
    userId: string;
    customerId: string | null;
    returnUrl: string;
  }): Promise<PortalResult>;
  cancelSubscription(input: {
    userId: string;
    subscriptionId: string;
    atPeriodEnd: boolean;
  }): Promise<{ ok: true } | { ok: false; error: string }>;
  verifyAndParseWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): Promise<NormalizedWebhookEvent>;
}

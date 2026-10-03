import type { BillingMethod, BillingPlanKey } from "@/lib/billing/config";

export type BillingUser = {
  id: string;
  email: string | null;
};

export type CreatePaymentInput = {
  user: BillingUser;
  plan: BillingPlanKey;
  /** Our Payment.id — used as idempotency / external reference. */
  paymentId: string;
  providerReference: string;
  amountCents: number;
  currency: string;
  successReturnUrl: string;
  failureReturnUrl: string;
};

export type CreatePaymentResult =
  | {
      ok: true;
      redirectUrl: string;
      providerReference: string;
    }
  | { ok: false; error: string };

export type VerifyPaymentResult =
  | {
      ok: true;
      status: "paid" | "pending" | "failed";
      /** Visa brand when method is card — must be "visa" when paid. */
      cardBrand?: string | null;
      providerReference: string;
      amountCents?: number;
      currency?: string;
    }
  | { ok: false; error: string };

export interface BillingProvider {
  readonly id: BillingMethod;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
  handleWebhook?(request: Request): Promise<VerifyPaymentResult>;
}

import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/db";
import {
  getBillingPlan,
  getSiteUrl,
  isBillingMethod,
  isBillingPlanKey,
  type BillingMethod,
  type BillingPlanKey,
} from "@/lib/billing/config";
import { requireTermsAccepted } from "@/lib/billing/service";
import { getBillingProvider } from "@/lib/billing/providers";
import { generateWhishExternalId } from "@/lib/billing/providers/whish";

function cardReference(): string {
  return `card_${randomBytes(12).toString("hex")}`;
}

export async function startBillingCheckout(input: {
  userId: string;
  email: string | null;
  plan: unknown;
  method: unknown;
}): Promise<
  | { ok: true; redirectUrl: string; paymentId: string }
  | { ok: false; error: string }
> {
  if (!isBillingPlanKey(input.plan)) {
    return { ok: false, error: "plan must be monthly or yearly" };
  }
  if (!isBillingMethod(input.method)) {
    return { ok: false, error: "method must be card or whish" };
  }

  const terms = await requireTermsAccepted();
  if (!terms.ok) return terms;

  const planKey = input.plan as BillingPlanKey;
  const method = input.method as BillingMethod;
  const plan = getBillingPlan(planKey);
  const providerReference =
    method === "whish" ? generateWhishExternalId() : cardReference();

  const prisma = getPrisma();
  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: method,
      providerReference,
      plan: planKey,
      amountCents: plan.amountCents,
      currency: plan.currency,
      status: "pending",
    },
  });

  const site = getSiteUrl();
  const successReturnUrl =
    method === "whish"
      ? `${site}/api/billing/return/whish?ref=${encodeURIComponent(providerReference)}`
      : `${site}/billing?checkout=success`;
  const failureReturnUrl = `${site}/billing/paywall?checkout=canceled`;

  const provider = getBillingProvider(method);
  const created = await provider.createPayment({
    user: { id: input.userId, email: input.email },
    plan: planKey,
    paymentId: payment.id,
    providerReference,
    amountCents: plan.amountCents,
    currency: plan.currency,
    successReturnUrl,
    failureReturnUrl,
  });

  if (!created.ok) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
    return created;
  }

  return {
    ok: true,
    redirectUrl: created.redirectUrl,
    paymentId: payment.id,
  };
}

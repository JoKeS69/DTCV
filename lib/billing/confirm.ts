import { getPrisma } from "@/lib/db";
import type { BillingPlanKey } from "@/lib/billing/config";
import { isBillingPlanKey } from "@/lib/billing/config";
import { computeExtendedAccessUntil } from "@/lib/billing/periods";

/**
 * Idempotent confirmation: first verified success extends access_until.
 * Duplicate / delayed callbacks are no-ops after paid.
 * Fail closed on unverified — never revoke already-paid access.
 */
export async function confirmPaidPayment(input: {
  provider: "card" | "whish";
  providerReference: string;
  /** Required for cards — reject non-Visa. */
  cardBrand?: string | null;
  now?: Date;
}): Promise<
  | { ok: true; alreadyPaid: boolean; accessUntil: Date | null; paymentId: string }
  | { ok: false; error: string; refundRequired?: boolean }
> {
  const prisma = getPrisma();
  const now = input.now ?? new Date();

  const payment = await prisma.payment.findUnique({
    where: {
      provider_providerReference: {
        provider: input.provider,
        providerReference: input.providerReference,
      },
    },
  });

  if (!payment) {
    return { ok: false, error: "Payment not found" };
  }

  if (payment.status === "paid") {
    const user = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: { accessUntil: true },
    });
    return {
      ok: true,
      alreadyPaid: true,
      accessUntil: user?.accessUntil ?? null,
      paymentId: payment.id,
    };
  }

  if (payment.status === "refunded" || payment.status === "failed") {
    return { ok: false, error: `Payment is ${payment.status}` };
  }

  if (input.provider === "card") {
    const brand = (input.cardBrand ?? payment.cardBrand ?? "")
      .trim()
      .toLowerCase();
    if (brand !== "visa") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          cardBrand: brand || null,
          updatedAt: now,
        },
      });
      return {
        ok: false,
        error: "Only Visa cards are accepted",
        refundRequired: true,
      };
    }
  }

  if (!isBillingPlanKey(payment.plan)) {
    return { ok: false, error: "Invalid payment plan" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { accessUntil: true },
  });
  if (!user) return { ok: false, error: "User not found" };

  const accessUntil = computeExtendedAccessUntil({
    plan: payment.plan as BillingPlanKey,
    now,
    currentAccessUntil: user.accessUntil,
  });

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: "pending" },
      data: {
        status: "paid",
        paidAt: now,
        cardBrand:
          input.provider === "card"
            ? (input.cardBrand ?? "visa").toLowerCase()
            : payment.cardBrand,
        updatedAt: now,
      },
    });
    // Lost the race — another confirmer already marked paid.
    if (updated.count === 0) return;

    await tx.user.update({
      where: { id: payment.userId },
      data: {
        accessUntil,
        billingPlan: payment.plan,
        // Keep legacy Investigator Pro fields in sync for older UI surfaces.
        subscriptionPlan: "PREMIUM",
        subscriptionStatus: "ACTIVE",
        subscriptionCurrentPeriodEnd: accessUntil,
        subscriptionCancelAtPeriodEnd: false,
      },
    });
  });

  const fresh = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { accessUntil: true },
  });

  return {
    ok: true,
    alreadyPaid: false,
    accessUntil: fresh?.accessUntil ?? accessUntil,
    paymentId: payment.id,
  };
}

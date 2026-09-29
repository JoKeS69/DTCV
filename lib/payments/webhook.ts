import { createHmac, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { getPlanByKey, getWebhookSecret } from "@/lib/payments/config";
import type { NormalizedWebhookEvent } from "@/lib/payments/types";
import type {
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/lib/generated/prisma/client";

export function signWebhookPayload(rawBody: string, secret = getWebhookSecret()) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret = getWebhookSecret(),
): boolean {
  if (!signatureHeader) return false;
  const expected = signWebhookPayload(rawBody, secret);
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Apply a normalized payment event to User subscription fields.
 * Idempotent via PaymentWebhookEvent primary key.
 * Event row is written in the same transaction as the entitlement update
 * so a crash cannot mark the event processed without applying changes.
 */
export async function applyWebhookEvent(
  event: NormalizedWebhookEvent,
): Promise<{ applied: boolean; reason?: string }> {
  const prisma = getPrisma();
  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: { id: event.id },
  });
  if (existing) return { applied: false, reason: "already_processed" };

  const user =
    (event.userId
      ? await prisma.user.findUnique({ where: { id: event.userId } })
      : null) ??
    (event.customerId
      ? await prisma.user.findFirst({
          where: { paymentCustomerId: event.customerId },
        })
      : null) ??
    (event.subscriptionId
      ? await prisma.user.findFirst({
          where: { paymentSubscriptionId: event.subscriptionId },
        })
      : null);

  if (!user) {
    return { applied: false, reason: "user_not_found" };
  }

  if (
    event.type !== "checkout.completed" &&
    event.type !== "subscription.updated" &&
    event.type !== "subscription.canceled" &&
    event.type !== "subscription.past_due"
  ) {
    return { applied: false, reason: "unhandled_type" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Claim idempotency key first inside the transaction.
      await tx.paymentWebhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          provider: event.provider,
          payload: event.raw as object,
        },
      });

      if (
        event.type === "checkout.completed" ||
        event.type === "subscription.updated"
      ) {
        const planKey = event.planKey ?? "investigator_pro";
        const plan = getPlanByKey(
          planKey === "free" ? "free" : "investigator_pro",
        );
        const dbPlan: SubscriptionPlan = plan.dbPlan;
        const status: SubscriptionStatus =
          dbPlan === "PREMIUM" ? "ACTIVE" : "FREE";

        await tx.user.update({
          where: { id: user.id },
          data: {
            subscriptionPlan: dbPlan,
            subscriptionStatus: status,
            paymentCustomerId: event.customerId ?? user.paymentCustomerId,
            paymentSubscriptionId:
              event.subscriptionId ?? user.paymentSubscriptionId,
            subscriptionCurrentPeriodEnd: event.currentPeriodEnd
              ? new Date(event.currentPeriodEnd)
              : user.subscriptionCurrentPeriodEnd,
            subscriptionCancelAtPeriodEnd: event.cancelAtPeriodEnd ?? false,
          },
        });
        return;
      }

      if (event.type === "subscription.canceled") {
        await tx.user.update({
          where: { id: user.id },
          data: {
            subscriptionPlan: "FREE",
            subscriptionStatus: "CANCELED",
            paymentSubscriptionId: null,
            subscriptionCancelAtPeriodEnd: false,
            subscriptionCurrentPeriodEnd: event.currentPeriodEnd
              ? new Date(event.currentPeriodEnd)
              : null,
          },
        });
        return;
      }

      // subscription.past_due
      await tx.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "PAST_DUE" },
      });
    });
  } catch (error) {
    // Concurrent claim of the same event id → treat as already processed.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { applied: false, reason: "already_processed" };
    }
    throw error;
  }

  return { applied: true };
}

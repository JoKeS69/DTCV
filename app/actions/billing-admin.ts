"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/db";

export type BillingAdminResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateBillingAdmin() {
  revalidatePath("/admin/subscriptions");
  revalidatePath("/billing");
  revalidatePath("/fictional");
}

export async function adminSetCompedAction(input: {
  userId: string;
  comped: boolean;
  reason: string;
}): Promise<BillingAdminResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Reason required (who + why)" };
  }

  await getPrisma().$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { comped: input.comped },
    });
    await tx.billingAdminAction.create({
      data: {
        adminUserId: gate.admin.id,
        targetUserId: input.userId,
        action: input.comped ? "grant_comped" : "revoke_comped",
        reason,
      },
    });
  });

  revalidateBillingAdmin();
  return { ok: true };
}

export async function adminExtendAccessAction(input: {
  userId: string;
  days: number;
  reason: string;
}): Promise<BillingAdminResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Reason required (who + why)" };
  }
  const days = Math.floor(input.days);
  if (!Number.isFinite(days) || days < 1 || days > 3660) {
    return { ok: false, error: "days must be 1–3660" };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { accessUntil: true },
  });
  if (!user) return { ok: false, error: "User not found" };

  const now = new Date();
  const base =
    user.accessUntil && user.accessUntil.getTime() > now.getTime()
      ? user.accessUntil
      : now;
  const accessUntil = new Date(base.getTime());
  accessUntil.setUTCDate(accessUntil.getUTCDate() + days);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        accessUntil,
        subscriptionPlan: "PREMIUM",
        subscriptionStatus: "ACTIVE",
        subscriptionCurrentPeriodEnd: accessUntil,
      },
    });
    await tx.billingAdminAction.create({
      data: {
        adminUserId: gate.admin.id,
        targetUserId: input.userId,
        action: "extend_access",
        reason,
        meta: { days, accessUntil: accessUntil.toISOString() },
      },
    });
  });

  revalidateBillingAdmin();
  return { ok: true };
}

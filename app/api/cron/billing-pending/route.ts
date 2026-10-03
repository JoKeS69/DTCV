import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getBillingProvider } from "@/lib/billing/providers";
import { confirmPaidPayment } from "@/lib/billing/confirm";
import { PENDING_PAYMENT_TTL_MS } from "@/lib/billing/limits";
import { RENEWAL_REMINDER_DAYS } from "@/lib/billing/config";

/**
 * Re-check pending Whish payments, expire stale ones, and note renewal reminders.
 * Auth: Authorization Bearer CRON_SECRET (same as other cron routes).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const now = new Date();
  const pending = await prisma.payment.findMany({
    where: { status: "pending", provider: "whish" },
    take: 100,
    orderBy: { createdAt: "asc" },
  });

  let confirmed = 0;
  let expired = 0;
  let failed = 0;
  const whish = getBillingProvider("whish");

  for (const payment of pending) {
    const age = now.getTime() - payment.createdAt.getTime();
    if (age > PENDING_PAYMENT_TTL_MS) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "expired" },
      });
      expired += 1;
      continue;
    }

    const verified = await whish.verifyPayment(payment.providerReference);
    if (!verified.ok) continue;
    if (verified.status === "paid") {
      const result = await confirmPaidPayment({
        provider: "whish",
        providerReference: payment.providerReference,
      });
      if (result.ok) confirmed += 1;
    } else if (verified.status === "failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed" },
      });
      failed += 1;
    }
  }

  // Renewal reminder candidates (in-app banner is primary; email if provider wired).
  const reminderUsers: { userId: string; days: number }[] = [];
  for (const days of RENEWAL_REMINDER_DAYS) {
    const start = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const rows = await prisma.user.findMany({
      where: {
        accessUntil: { gte: start, lt: end },
        comped: false,
        role: { not: "ADMIN" },
      },
      select: { id: true },
      take: 200,
    });
    for (const row of rows) {
      reminderUsers.push({ userId: row.id, days });
    }
  }

  // Email reminders only when a real mailer is configured (site currently placeholder).
  const emailEnabled =
    process.env.AUTH_EMAIL_PLACEHOLDER !== "true" &&
    Boolean(process.env.SMTP_URL || process.env.RESEND_API_KEY);

  return NextResponse.json({
    ok: true,
    confirmed,
    expired,
    failed,
    reminders: reminderUsers.length,
    emailEnabled,
    note: emailEnabled
      ? "Email reminders queued conceptually — wire SMTP/RESEND delivery."
      : "In-app renewal banner only (email not configured).",
  });
}

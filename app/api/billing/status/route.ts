import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/server/authz";
import {
  getBillingPlans,
  getTrialDays,
} from "@/lib/billing/config";
import {
  daysUntilAccessEnd,
} from "@/lib/billing/access";
import { loadAccessDecision, listUserPayments } from "@/lib/billing/service";
import { getPrisma } from "@/lib/db";

export async function GET(request: Request) {
  const gate = await requireActiveUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 401 });
  }

  const decision = await loadAccessDecision(gate.user.id);
  if (!decision) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const includePayments = url.searchParams.get("payments") === "1";
  const user = await getPrisma().user.findUnique({
    where: { id: gate.user.id },
    select: { cardAutoRenew: true },
  });

  const daysRemaining = daysUntilAccessEnd(decision);

  const payload = {
    allowed: decision.allowed,
    status: decision.status,
    reason: decision.reason,
    trialEndsAt: decision.trialEndsAt?.toISOString() ?? null,
    accessUntil: decision.accessUntil?.toISOString() ?? null,
    hasUsedTrial: decision.hasUsedTrial,
    billingPlan: decision.billingPlan,
    cardAutoRenew: user?.cardAutoRenew ?? false,
    daysRemaining,
    canStartTrial: !decision.hasUsedTrial && gate.user.role !== "ADMIN",
    trialDays: getTrialDays(),
    plans: getBillingPlans().map((p) => ({
      key: p.key,
      label: p.label,
      amountCents: p.amountCents,
      currency: p.currency,
    })),
    payments: includePayments
      ? await listUserPayments(gate.user.id)
      : undefined,
  };

  return NextResponse.json(payload);
}

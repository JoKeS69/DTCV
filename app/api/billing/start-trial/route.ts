import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/server/authz";
import { startTrialForUser } from "@/lib/billing/service";
import { rateLimit, userRateKey } from "@/lib/rate-limit";
import { BILLING_LIMITS } from "@/lib/billing/limits";

export async function POST() {
  const gate = await requireActiveUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 401 });
  }

  const limited = rateLimit(
    userRateKey("billing-trial", gate.user.id),
    BILLING_LIMITS.trial,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Rate limited — retry in ${limited.retryAfterSec}s` },
      { status: 429 },
    );
  }

  const result = await startTrialForUser(gate.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    trialEndsAt: result.trialEndsAt.toISOString(),
  });
}

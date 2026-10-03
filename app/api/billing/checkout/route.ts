import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/server/authz";
import { startBillingCheckout } from "@/lib/billing/checkout";
import { rateLimit, userRateKey } from "@/lib/rate-limit";
import { BILLING_LIMITS } from "@/lib/billing/limits";

export async function POST(request: Request) {
  const gate = await requireActiveUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 401 });
  }

  const limited = rateLimit(
    userRateKey("billing-checkout", gate.user.id),
    BILLING_LIMITS.checkout,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Rate limited — retry in ${limited.retryAfterSec}s` },
      { status: 429 },
    );
  }

  let body: { plan?: unknown; method?: unknown };
  try {
    body = (await request.json()) as { plan?: unknown; method?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await startBillingCheckout({
    userId: gate.user.id,
    email: gate.user.email,
    plan: body.plan,
    method: body.method,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    redirectUrl: result.redirectUrl,
    paymentId: result.paymentId,
  });
}

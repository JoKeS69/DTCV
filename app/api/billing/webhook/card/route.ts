import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { applyWebhookEvent } from "@/lib/payments/webhook";
import { confirmPaidPayment } from "@/lib/billing/confirm";
import { getPrisma } from "@/lib/db";
import { networkRateKey, rateLimit, WEBHOOK_LIMITS } from "@/lib/rate-limit";

/**
 * Visa / card webhook — authenticity via existing HMAC provider verification.
 * On first confirmed success, extends access_until via Payment record.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const limited = rateLimit(
    networkRateKey("billing-webhook-card", ip),
    WEBHOOK_LIMITS.network,
  );
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get("x-detective-signature") ||
    request.headers.get("x-signature");

  try {
    const provider = getPaymentProvider();
    const event = await provider.verifyAndParseWebhook(rawBody, signature);
    const applied = await applyWebhookEvent(event);

    if (event.type === "checkout.completed" && event.subscriptionId) {
      // Link prepaid Payment by checkout session / provider ref if present.
      const raw = event.raw as { sessionId?: string } | null;
      const sessionId = raw?.sessionId;
      if (sessionId) {
        const payment = await getPrisma().payment.findFirst({
          where: {
            provider: "card",
            checkoutSessionId: sessionId,
            status: "pending",
          },
        });
        if (payment) {
          await confirmPaidPayment({
            provider: "card",
            providerReference: payment.providerReference,
            cardBrand: "visa",
          });
        }
      }
    }

    return NextResponse.json({ ok: true, applied: applied.applied });
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}

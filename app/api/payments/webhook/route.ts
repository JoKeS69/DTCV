import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { applyWebhookEvent } from "@/lib/payments/webhook";

/**
 * Signed payment webhook / callback endpoint.
 * Header: `x-detective-signature: <hex hmac sha256 of raw body>`
 * (also accepts `x-payments-signature`)
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-detective-signature") ??
    request.headers.get("x-payments-signature");

  try {
    const provider = getPaymentProvider();
    const event = await provider.verifyAndParseWebhook(rawBody, signature);
    const result = await applyWebhookEvent(event);
    return NextResponse.json({
      ok: true,
      applied: result.applied,
      reason: result.reason ?? null,
      eventId: event.id,
    });
  } catch (error) {
    console.error("[payments.webhook]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Webhook rejected",
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { applyWebhookEvent } from "@/lib/payments/webhook";
import { WEBHOOK_LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * Signed payment webhook / callback endpoint.
 * Header: `x-detective-signature: <hex hmac sha256 of raw body>`
 * (also accepts `x-payments-signature`)
 */
export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const limited = rateLimit(`webhook:${ip}`, WEBHOOK_LIMITS.ip);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limited" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

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
    // Do not echo internal error messages to callers.
    return NextResponse.json(
      { ok: false, error: "Webhook rejected" },
      { status: 400 },
    );
  }
}

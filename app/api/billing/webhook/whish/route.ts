import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/providers";
import { confirmPaidPayment } from "@/lib/billing/confirm";
import { getPrisma } from "@/lib/db";
import { networkRateKey, rateLimit, WEBHOOK_LIMITS } from "@/lib/rate-limit";

/**
 * Whish callback — NEVER grants access from URL alone.
 * Always re-checks status server-to-server via WhishProvider.verifyPayment.
 */
export async function GET(request: Request) {
  return handleWhishWebhook(request);
}

export async function POST(request: Request) {
  return handleWhishWebhook(request);
}

async function handleWhishWebhook(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const limited = rateLimit(
    networkRateKey("billing-webhook-whish", ip),
    WEBHOOK_LIMITS.network,
  );
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const url = new URL(request.url);
  const outcome = url.searchParams.get("outcome");
  if (outcome === "failure") {
    const externalId =
      url.searchParams.get("externalId") ||
      url.searchParams.get("external_id");
    if (externalId) {
      await getPrisma().payment.updateMany({
        where: {
          provider: "whish",
          providerReference: externalId,
          status: "pending",
        },
        data: { status: "failed" },
      });
    }
    return NextResponse.json({ ok: true, status: "failed" });
  }

  const whish = getBillingProvider("whish");
  const verified = whish.handleWebhook
    ? await whish.handleWebhook(request)
    : await whish.verifyPayment(
        url.searchParams.get("externalId") ||
          url.searchParams.get("external_id") ||
          "",
      );

  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  if (verified.status !== "paid") {
    // Fail closed — no new access.
    return NextResponse.json({
      ok: true,
      status: verified.status,
      granted: false,
    });
  }

  const confirmed = await confirmPaidPayment({
    provider: "whish",
    providerReference: verified.providerReference,
  });

  if (!confirmed.ok) {
    return NextResponse.json({ error: confirmed.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    status: "paid",
    granted: !confirmed.alreadyPaid,
    alreadyPaid: confirmed.alreadyPaid,
  });
}

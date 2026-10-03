import { randomInt } from "node:crypto";
import {
  getSiteUrl,
  type BillingPlanKey,
} from "@/lib/billing/config";
import type {
  BillingProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentResult,
} from "@/lib/billing/types";

/**
 * Whish Money (Whish Pay) provider.
 *
 * IMPORTANT — official merchant docs were NOT in the repo at implementation time.
 * Endpoint paths / headers below are driven by env so production can match the
 * owner's official Whish merchant documentation. Do NOT go live until the owner
 * verifies WHISH_* against Whish's own docs (not community packages).
 *
 * TODOs for owner:
 * - Obtain Whish merchant credentials (channel + secret) + official API docs
 * - Confirm sandbox vs live base URLs and path names
 * - Confirm auth header names (WHISH_CHANNEL_HEADER / WHISH_SECRET_HEADER)
 * - Confirm webhook/callback authenticity rules
 */

function whishEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function whishConfigured(): boolean {
  return Boolean(
    whishEnv("WHISH_CHANNEL") &&
      whishEnv("WHISH_SECRET") &&
      whishEnv("WHISH_BASE_URL"),
  );
}

export function getWhishBaseUrl(): string {
  const base = whishEnv("WHISH_BASE_URL");
  if (!base) {
    throw new Error(
      "WHISH_BASE_URL is required (set from official Whish merchant docs)",
    );
  }
  return base.replace(/\/$/, "");
}

function whishMode(): "sandbox" | "live" {
  return (whishEnv("WHISH_MODE") ?? "sandbox").toLowerCase() === "live"
    ? "live"
    : "sandbox";
}

/** Numeric external id for Whish collect APIs. */
export function generateWhishExternalId(): string {
  // timestamp + random — store as providerReference before createPayment.
  return `${Date.now()}${randomInt(100, 999)}`;
}

async function whishFetch(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const channel = whishEnv("WHISH_CHANNEL");
  const secret = whishEnv("WHISH_SECRET");
  const websiteUrl = whishEnv("WHISH_WEBSITE_URL") || getSiteUrl();
  if (!channel || !secret) {
    throw new Error("WHISH_CHANNEL and WHISH_SECRET are required");
  }

  const channelHeader = whishEnv("WHISH_CHANNEL_HEADER") || "channel";
  const secretHeader = whishEnv("WHISH_SECRET_HEADER") || "secret";
  const websiteHeader = whishEnv("WHISH_WEBSITE_HEADER") || "websiteurl";

  const url = `${getWhishBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      [channelHeader]: channel,
      [secretHeader]: secret,
      [websiteHeader]: websiteUrl,
      ...(init.headers ?? {}),
    },
  });
}

export const whishBillingProvider: BillingProvider = {
  id: "whish",

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!whishConfigured()) {
      return {
        ok: false,
        error:
          "Whish is not configured. Owner must set WHISH_BASE_URL, WHISH_CHANNEL, WHISH_SECRET from official merchant docs.",
      };
    }

    // TODO(owner): verify path against official Whish merchant docs before production.
    const createPath =
      whishEnv("WHISH_CREATE_PAYMENT_PATH") || "/payment/whish";
    const site = getSiteUrl();
    const amount = input.amountCents / 100;
    const currency = input.currency.toUpperCase();

    try {
      const res = await whishFetch(createPath, {
        method: "POST",
        body: JSON.stringify({
          amount,
          currency,
          invoice: `DETECTIVE ${input.plan} access`,
          externalId: Number(input.providerReference),
          successCallbackUrl: `${site}/api/billing/webhook/whish?outcome=success`,
          failureCallbackUrl: `${site}/api/billing/webhook/whish?outcome=failure`,
          successRedirectUrl: input.successReturnUrl,
          failureRedirectUrl: input.failureReturnUrl,
        }),
      });

      if (!res.ok) {
        return {
          ok: false,
          error: `Whish createPayment HTTP ${res.status} (${whishMode()})`,
        };
      }

      const data = (await res.json()) as {
        status?: boolean;
        data?: { collectUrl?: string };
        collectUrl?: string;
        code?: string;
        dialog?: { message?: string };
      };

      const collectUrl =
        data.collectUrl ||
        data.data?.collectUrl ||
        (data as { collecturl?: string }).collecturl;

      if (!collectUrl) {
        return {
          ok: false,
          error:
            data.dialog?.message ||
            data.code ||
            "Whish did not return a collect URL — verify WHISH_CREATE_PAYMENT_PATH against official docs",
        };
      }

      return {
        ok: true,
        redirectUrl: collectUrl,
        providerReference: input.providerReference,
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Whish createPayment failed",
      };
    }
  },

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    if (!whishConfigured()) {
      return { ok: false, error: "Whish is not configured" };
    }

    // TODO(owner): verify path/query against official Whish merchant docs.
    const statusPath =
      whishEnv("WHISH_PAYMENT_STATUS_PATH") || "/payment/status";
    const currency = (whishEnv("CURRENCY") || "USD").toUpperCase();

    try {
      const res = await whishFetch(statusPath, {
        method: "POST",
        body: JSON.stringify({
          currency,
          externalId: Number(reference),
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `Whish status HTTP ${res.status}` };
      }
      const data = (await res.json()) as {
        data?: {
          collectStatus?: string;
          amount?: number;
          currency?: string;
        };
        collectStatus?: string;
        amount?: number;
        currency?: string;
      };
      const collectStatus = (
        data.collectStatus ||
        data.data?.collectStatus ||
        "pending"
      ).toLowerCase();

      if (collectStatus === "success" || collectStatus === "paid") {
        return {
          ok: true,
          status: "paid",
          providerReference: reference,
          amountCents: Math.round(
            ((data.amount ?? data.data?.amount ?? 0) as number) * 100,
          ),
          currency: (data.currency || data.data?.currency || currency).toLowerCase(),
        };
      }
      if (collectStatus === "failed" || collectStatus === "failure") {
        return {
          ok: true,
          status: "failed",
          providerReference: reference,
        };
      }
      return {
        ok: true,
        status: "pending",
        providerReference: reference,
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Whish verify failed",
      };
    }
  },

  async handleWebhook(request: Request): Promise<VerifyPaymentResult> {
    const url = new URL(request.url);
    const externalId =
      url.searchParams.get("externalId") ||
      url.searchParams.get("external_id");
    if (!externalId) {
      // Try JSON body
      try {
        const body = (await request.clone().json()) as {
          externalId?: string | number;
        };
        if (body.externalId != null) {
          return this.verifyPayment(String(body.externalId));
        }
      } catch {
        // ignore
      }
      return { ok: false, error: "Missing externalId on Whish webhook" };
    }
    return this.verifyPayment(externalId);
  },
};

export type WhishPlan = BillingPlanKey;

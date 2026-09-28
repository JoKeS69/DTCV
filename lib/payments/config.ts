/**
 * Payments config — amounts and labels from env (never hard-code in UI logic).
 * INVESTIGATOR PRO maps to SubscriptionPlan.PREMIUM in the DB.
 */

export type PaymentsMode = "test" | "live";
export type PaymentsProviderId = "dev_visa" | "visa_gateway";

export type PlanKey = "free" | "investigator_pro";

export type PlanDefinition = {
  key: PlanKey;
  /** DB enum value */
  dbPlan: "FREE" | "PREMIUM";
  label: string;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
};

function intEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function getPaymentsMode(): PaymentsMode {
  const mode = (process.env.PAYMENTS_MODE ?? "test").trim().toLowerCase();
  return mode === "live" ? "live" : "test";
}

export function getWebhookSecret(): string {
  return (
    process.env.PAYMENTS_WEBHOOK_SECRET?.trim() ||
    "dev-only-webhook-secret-change-me"
  );
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function visaGatewayConfigured(): boolean {
  return Boolean(
    process.env.VISA_GATEWAY_MERCHANT_ID?.trim() &&
      process.env.VISA_GATEWAY_API_KEY_ID?.trim() &&
      process.env.VISA_GATEWAY_API_SECRET?.trim(),
  );
}

/** Resolve active provider: live Visa gateway when configured, else test Visa. */
export function getActiveProviderId(): PaymentsProviderId {
  const forced = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase();
  if (forced === "visa_gateway" || forced === "dev_visa") {
    return forced;
  }
  if (getPaymentsMode() === "live" && visaGatewayConfigured()) {
    return "visa_gateway";
  }
  return "dev_visa";
}

export function getPlanCatalog(): PlanDefinition[] {
  const proAmount = intEnv("PAYMENTS_PRO_AMOUNT_CENTS", 1200);
  const proCurrency = (
    process.env.PAYMENTS_PRO_CURRENCY?.trim() || "usd"
  ).toLowerCase();
  const proInterval =
    process.env.PAYMENTS_PRO_INTERVAL?.trim().toLowerCase() === "year"
      ? "year"
      : "month";
  const proLabel =
    process.env.PAYMENTS_PRO_LABEL?.trim() || "Investigator Pro";

  return [
    {
      key: "free",
      dbPlan: "FREE",
      label: process.env.PAYMENTS_FREE_LABEL?.trim() || "Free",
      amountCents: 0,
      currency: proCurrency,
      interval: proInterval,
      features: [
        "Real case database (sourced)",
        "Community discussions",
        "Fictional NOVICE + INTERMEDIATE training",
        "Investigation board (core)",
        "Detective XP & ranks",
      ],
    },
    {
      key: "investigator_pro",
      dbPlan: "PREMIUM",
      label: proLabel,
      amountCents: proAmount,
      currency: proCurrency,
      interval: proInterval,
      features: [
        "Full fictional library (ADVANCED + EXPERT)",
        "Advanced detective stats",
        "Premium challenges bay",
        "Community extras (priority threads)",
        "Future AI assist slot",
      ],
    },
  ];
}

export function getPlanByKey(key: PlanKey): PlanDefinition {
  const plan = getPlanCatalog().find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown plan: ${key}`);
  return plan;
}

export function formatMoney(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

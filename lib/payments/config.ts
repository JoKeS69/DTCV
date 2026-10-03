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

/**
 * HMAC secret for payment webhooks. Fail closed — never use a hard-coded default.
 * Local: set PAYMENTS_WEBHOOK_SECRET in `.env.local` (see `.env.example`).
 */
export function getWebhookSecret(): string {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "PAYMENTS_WEBHOOK_SECRET is required (no default). Set it in the environment.",
    );
  }
  const placeholders = new Set([
    "dev-only-webhook-secret-change-me",
    "replace-with-a-long-random-webhook-secret",
  ]);
  if (placeholders.has(secret)) {
    throw new Error(
      "PAYMENTS_WEBHOOK_SECRET must not use the documented placeholder value.",
    );
  }
  if (secret.length < 16) {
    throw new Error("PAYMENTS_WEBHOOK_SECRET must be at least 16 characters.");
  }
  return secret;
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

/**
 * Resolve active provider.
 * Live mode never falls back to `dev_visa` (would allow free Pro via test checkout).
 */
export function getActiveProviderId(): PaymentsProviderId {
  const mode = getPaymentsMode();
  const forced = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase();

  if (forced === "dev_visa") {
    if (mode === "live") {
      throw new Error(
        "PAYMENTS_PROVIDER=dev_visa is forbidden when PAYMENTS_MODE=live",
      );
    }
    return "dev_visa";
  }
  if (forced === "visa_gateway") {
    return "visa_gateway";
  }
  if (mode === "live") {
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
        "Real case database",
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

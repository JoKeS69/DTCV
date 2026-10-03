/**
 * Single pricing / trial config for Fictional cases access.
 * Amounts and trial length come from env — never scatter hard-coded prices in UI.
 */

export type BillingPlanKey = "monthly" | "yearly";
export type BillingMethod = "card" | "whish";

export type BillingPlanDefinition = {
  key: BillingPlanKey;
  label: string;
  amountCents: number;
  currency: string;
  intervalDays: number;
};

function intEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function getCurrency(): string {
  return (process.env.CURRENCY?.trim() || "usd").toLowerCase();
}

/** Default TRIAL_DAYS = 7. One trial per account, ever. */
export function getTrialDays(): number {
  return intEnv("TRIAL_DAYS", 7);
}

/** Card auto-renew optional; default OFF. Whish is always manual. */
export function isCardAutoRenewEnabledByDefault(): boolean {
  return (process.env.BILLING_CARD_AUTO_RENEW_DEFAULT ?? "0").trim() === "1";
}

export function getBillingPlans(): BillingPlanDefinition[] {
  const currency = getCurrency();
  return [
    {
      key: "monthly",
      label: process.env.BILLING_MONTHLY_LABEL?.trim() || "Monthly",
      amountCents: intEnv("BILLING_MONTHLY_AMOUNT_CENTS", 299),
      currency,
      intervalDays: 30,
    },
    {
      key: "yearly",
      label: process.env.BILLING_YEARLY_LABEL?.trim() || "Yearly",
      amountCents: intEnv("BILLING_YEARLY_AMOUNT_CENTS", 2499),
      currency,
      intervalDays: 365,
    },
  ];
}

export function getBillingPlan(key: BillingPlanKey): BillingPlanDefinition {
  const plan = getBillingPlans().find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown billing plan: ${key}`);
  return plan;
}

export function isBillingPlanKey(value: unknown): value is BillingPlanKey {
  return value === "monthly" || value === "yearly";
}

export function isBillingMethod(value: unknown): value is BillingMethod {
  return value === "card" || value === "whish";
}

export function formatBillingMoney(
  amountCents: number,
  currency = getCurrency(),
): string {
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

export const PAYWALL_METHODS_COPY =
  "We accept Visa cards and Whish Money only.";

export const PAYWALL_RENEWAL_COPY =
  "Visa and Whish Money only. Subscriptions don't renew automatically unless you enable card auto-renew. We'll remind you before your access ends.";

/** Days before access_until to show renewal banner / email. */
export const RENEWAL_REMINDER_DAYS = [7, 3, 1] as const;

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

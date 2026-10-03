import type { BillingMethod } from "@/lib/billing/config";
import type { BillingProvider } from "@/lib/billing/types";
import { cardBillingProvider } from "@/lib/billing/providers/card";
import { whishBillingProvider } from "@/lib/billing/providers/whish";

export function getBillingProvider(method: BillingMethod): BillingProvider {
  if (method === "card") return cardBillingProvider;
  if (method === "whish") return whishBillingProvider;
  throw new Error(`Unsupported billing method: ${method as string}`);
}

export { cardBillingProvider, whishBillingProvider };

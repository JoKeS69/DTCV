import {
  getActiveProviderId,
  getPaymentsMode,
  visaGatewayConfigured,
} from "@/lib/payments/config";
import { devVisaProvider } from "@/lib/payments/providers/dev-visa";
import { visaGatewayProvider } from "@/lib/payments/providers/visa-gateway";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProvider(): PaymentProvider {
  const mode = getPaymentsMode();
  const id = getActiveProviderId();

  if (mode === "live") {
    if (id === "dev_visa") {
      throw new Error(
        "PAYMENTS_MODE=live cannot use the test Visa provider (dev_visa)",
      );
    }
    if (!visaGatewayConfigured()) {
      throw new Error(
        "PAYMENTS_MODE=live requires VISA_GATEWAY_* credentials",
      );
    }
    return visaGatewayProvider;
  }

  if (id === "visa_gateway") {
    if (!visaGatewayConfigured()) {
      throw new Error(
        "PAYMENTS_PROVIDER=visa_gateway requires VISA_GATEWAY_* credentials",
      );
    }
    return visaGatewayProvider;
  }

  return devVisaProvider;
}

export function paymentsStatusSummary() {
  const mode = getPaymentsMode();
  let provider: "dev_visa" | "visa_gateway" = "dev_visa";
  try {
    provider = getActiveProviderId();
  } catch {
    provider = mode === "live" ? "visa_gateway" : "dev_visa";
  }
  const gatewayReady = visaGatewayConfigured();
  return {
    mode,
    provider:
      mode === "live" || (gatewayReady && provider === "visa_gateway")
        ? "visa_gateway"
        : "dev_visa",
    gatewayConfigured: gatewayReady,
    acceptsVisa: true,
    testMode: mode === "test",
  };
}

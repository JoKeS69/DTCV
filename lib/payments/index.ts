import {
  getActiveProviderId,
  getPaymentsMode,
  visaGatewayConfigured,
} from "@/lib/payments/config";
import { devVisaProvider } from "@/lib/payments/providers/dev-visa";
import { visaGatewayProvider } from "@/lib/payments/providers/visa-gateway";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProvider(): PaymentProvider {
  const id = getActiveProviderId();
  if (id === "visa_gateway") {
    if (!visaGatewayConfigured()) {
      if (getPaymentsMode() === "live") {
        throw new Error(
          "PAYMENTS_MODE=live requires VISA_GATEWAY_* credentials",
        );
      }
      return devVisaProvider;
    }
    return visaGatewayProvider;
  }
  return devVisaProvider;
}

export function paymentsStatusSummary() {
  const mode = getPaymentsMode();
  const provider = getActiveProviderId();
  const gatewayReady = visaGatewayConfigured();
  return {
    mode,
    provider: gatewayReady && provider === "visa_gateway" ? "visa_gateway" : "dev_visa",
    gatewayConfigured: gatewayReady,
    acceptsVisa: true,
    testMode: mode === "test" || !gatewayReady,
  };
}

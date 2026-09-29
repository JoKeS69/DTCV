"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/observability/analytics";

/**
 * Client boot for analytics placeholders.
 * Safe no-op until NEXT_PUBLIC_ANALYTICS_ENABLED=true.
 */
export function ObservabilityBoot() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);

  return null;
}

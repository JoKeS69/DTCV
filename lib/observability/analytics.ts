/**
 * ANALYTICS PLACEHOLDER — Phase 14
 * ------------------------------------------------------------------
 * Privacy-conscious product analytics stub.
 * Set NEXT_PUBLIC_ANALYTICS_ENABLED=true and ANALYTICS_WRITE_KEY when ready.
 * Do not send PII (email, billing ids, theory bodies).
 */

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function isAnalyticsEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED?.trim() === "true" &&
    Boolean(process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY?.trim())
  );
}

/** Track a named event. No-op until analytics is explicitly enabled. */
export function trackEvent(name: string, props?: AnalyticsProps): void {
  if (!isAnalyticsEnabled()) return;
  // TODO(phase-14+): forward to analytics provider — never include email/PAN/PII
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics:placeholder]", name, props ?? {});
  }
}

/** Page view hook for client routers. No-op until enabled. */
export function trackPageView(path: string): void {
  trackEvent("page_view", { path });
}

/**
 * ERROR MONITORING PLACEHOLDER — Phase 14
 * ------------------------------------------------------------------
 * Wire a real provider (e.g. Sentry) before production launch.
 * Set ERROR_MONITORING_DSN in the environment when ready.
 * This module must remain a no-op until a DSN is configured.
 */

export type ErrorContext = Record<string, string | number | boolean | null | undefined>;

export function isErrorMonitoringEnabled(): boolean {
  return Boolean(process.env.ERROR_MONITORING_DSN?.trim());
}

/** Capture an exception. No-op until ERROR_MONITORING_DSN is set. */
export function captureException(error: unknown, context?: ErrorContext): void {
  if (!isErrorMonitoringEnabled()) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[monitoring:placeholder]", error, context ?? {});
    }
    return;
  }
  // TODO(phase-14+): initialize provider SDK with ERROR_MONITORING_DSN
  console.error("[monitoring:pending-provider]", error, context ?? {});
}

/** Capture a breadcrumb/message. No-op until provider wired. */
export function captureMessage(message: string, context?: ErrorContext): void {
  if (!isErrorMonitoringEnabled()) return;
  console.info("[monitoring:pending-provider]", message, context ?? {});
}

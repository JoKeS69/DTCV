export {
  evaluateFictionalAccess,
  daysUntilAccessEnd,
  shouldShowRenewalBanner,
  type AccessDecision,
  type AccessInput,
} from "@/lib/billing/access";
export {
  getBillingPlans,
  getBillingPlan,
  getTrialDays,
  formatBillingMoney,
  PAYWALL_METHODS_COPY,
  PAYWALL_RENEWAL_COPY,
  RENEWAL_REMINDER_DAYS,
  type BillingPlanKey,
  type BillingMethod,
} from "@/lib/billing/config";
export { computeExtendedAccessUntil, computeTrialWindow } from "@/lib/billing/periods";
export { confirmPaidPayment } from "@/lib/billing/confirm";
export {
  loadAccessDecision,
  startTrialForUser,
  listUserPayments,
  requireTermsAccepted,
} from "@/lib/billing/service";
export {
  checkFictionalAccess,
  requireFictionalAccessOrRedirect,
  requireFictionalAccessAction,
} from "@/lib/billing/gate";
export { startBillingCheckout } from "@/lib/billing/checkout";
export { getBillingProvider } from "@/lib/billing/providers";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PaywallPanel } from "@/components/billing/PaywallPanel";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  formatBillingMoney,
  getBillingPlans,
  getTrialDays,
} from "@/lib/billing/config";
import { loadAccessDecision } from "@/lib/billing/service";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { safeCallbackPath } from "@/lib/server/authz";

export const metadata: Metadata = privatePageMetadata("Fictional access");

export default async function PaywallPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const callbackUrl = safeCallbackPath(params.callbackUrl, "/fictional");

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/billing/paywall?callbackUrl=${callbackUrl}`)}`);
  }

  const decision = await loadAccessDecision(session.user.id);
  if (decision?.allowed) {
    redirect(callbackUrl);
  }

  const plans = getBillingPlans().map((p) => ({
    key: p.key,
    label: p.label,
    priceLabel: `${formatBillingMoney(p.amountCents, p.currency)} / ${p.key === "yearly" ? "year" : "month"}`,
  }));

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <SiteHeader />
      <main className="deck-page max-w-2xl flex-1">
        {params.checkout === "canceled" ? (
          <p className="mb-3 font-mono text-[11px] text-amber">
            Checkout canceled. No charge was made.
          </p>
        ) : null}
        <PaywallPanel
          trialDays={getTrialDays()}
          hasUsedTrial={decision?.hasUsedTrial ?? false}
          plans={plans}
          callbackUrl={callbackUrl}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

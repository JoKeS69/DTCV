import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  CancelSubscriptionButton,
} from "@/components/billing/BillingActions";
import { SubscriptionSection } from "@/components/billing/SubscriptionSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { paymentsStatusSummary } from "@/lib/payments";
import { loadAccessDecision, listUserPayments } from "@/lib/billing/service";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Billing");

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/billing");

  const decision = await loadAccessDecision(session.user.id);
  if (!decision) redirect("/login?callbackUrl=/billing");

  const payments = await listUserPayments(session.user.id);
  const status = paymentsStatusSummary();

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <SiteHeader />
      <main className="deck-page max-w-2xl flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
          &gt; Subscription desk · DETECTIVE
        </p>
        <h1 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.1em] text-text">
          Billing
        </h1>
        <p className="mt-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
          Fictional cases access — Visa and Whish Money only
          {status.testMode ? " (card test mode)" : ""}. Prepaid periods; no
          automatic Whish renewals.
        </p>

        {params.checkout === "success" ? (
          <p className="mt-3 border border-online/40 bg-online/10 px-3 py-2 font-mono text-[11px] text-online">
            Checkout complete. Access extends after verified payment confirmation.
          </p>
        ) : null}

        <SubscriptionSection decision={decision} payments={payments} />

        <div className="mt-4 flex flex-wrap gap-2">
          {!decision.allowed ? (
            <Link
              href="/billing/paywall?callbackUrl=/billing"
              className="border border-cta/50 bg-cta/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text"
            >
              Start trial or subscribe
            </Link>
          ) : (
            <CancelSubscriptionButton />
          )}
          <Link
            href="/pricing"
            className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text"
          >
            View pricing
          </Link>
          <Link
            href="/fictional"
            className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text"
          >
            Fictional cases
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

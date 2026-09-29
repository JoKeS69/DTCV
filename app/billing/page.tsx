import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  CancelSubscriptionButton,
  UpgradeButton,
} from "@/components/billing/BillingActions";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { paymentsStatusSummary } from "@/lib/payments";
import { getUserEntitlements } from "@/lib/payments/entitlements";
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

  const entitlements = await getUserEntitlements(session.user.id);
  if (!entitlements) redirect("/login?callbackUrl=/billing");

  const status = paymentsStatusSummary();

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-8 md:px-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
          &gt; Subscription desk · DETECTIVE
        </p>
        <h1 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.1em] text-text">
          Billing
        </h1>
        <p className="mt-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
          Manage Investigator Pro. Payments accept Visa through the configured
          provider{status.testMode ? " (test mode)" : ""}.
        </p>

        {params.checkout === "success" ? (
          <p className="mt-3 border border-online/40 bg-online/10 px-3 py-2 font-mono text-[11px] text-online">
            Checkout complete. Clearance updated via signed payment webhook.
          </p>
        ) : null}

        <section className="mt-6 border border-border bg-surface/40">
          <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
            &gt; Current plan
          </header>
          <dl className="grid gap-3 px-4 py-4 font-mono text-[11px] uppercase tracking-[0.12em] sm:grid-cols-2">
            <div>
              <dt className="text-text-dim">Plan</dt>
              <dd className="mt-1 text-text">{entitlements.label}</dd>
            </div>
            <div>
              <dt className="text-text-dim">Status</dt>
              <dd className="mt-1 text-text">{entitlements.status}</dd>
            </div>
            <div>
              <dt className="text-text-dim">Period end</dt>
              <dd className="mt-1 normal-case tracking-normal text-text">
                {entitlements.currentPeriodEnd
                  ? entitlements.currentPeriodEnd.toISOString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-dim">Cancel at period end</dt>
              <dd className="mt-1 text-text">
                {entitlements.cancelAtPeriodEnd ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-text-dim">Customer id</dt>
              <dd className="mt-1 normal-case tracking-normal text-text-muted break-all">
                {entitlements.paymentCustomerId ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-dim">Subscription id</dt>
              <dd className="mt-1 normal-case tracking-normal text-text-muted break-all">
                {entitlements.paymentSubscriptionId ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          {!entitlements.isPremium ? (
            <UpgradeButton />
          ) : (
            <>
              <CancelSubscriptionButton />
              <CancelSubscriptionButton immediate />
            </>
          )}
          <Link
            href="/pricing"
            className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text"
          >
            View pricing
          </Link>
          <Link
            href="/profile"
            className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text"
          >
            Profile
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

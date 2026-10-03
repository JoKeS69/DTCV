import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  formatBillingMoney,
  getBillingPlans,
  getTrialDays,
  PAYWALL_METHODS_COPY,
  PAYWALL_RENEWAL_COPY,
} from "@/lib/billing/config";
import { loadAccessDecision } from "@/lib/billing/service";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "DETECTIVE Fictional cases access — free trial, then Visa or Whish Money prepaid plans.",
  path: "/pricing",
});

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const decision = session?.user?.id
    ? await loadAccessDecision(session.user.id)
    : null;
  const plans = getBillingPlans();
  const trialDays = getTrialDays();

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <SiteHeader />
      <main className="deck-page relative max-w-5xl flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(138,153,173,0.18), transparent 70%), linear-gradient(180deg, #0a0c0f 0%, #050607 100%)",
          }}
        />

        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
          &gt; Fictional cases · DETECTIVE
        </p>
        <h1 className="mt-2 font-mono text-3xl font-semibold uppercase tracking-[0.12em] text-text md:text-4xl">
          DETECTIVE
        </h1>
        <p className="mt-2 max-w-xl font-mono text-[12px] text-text-muted normal-case tracking-normal">
          Real case files stay free. Fictional Investigation Mode uses a{" "}
          {trialDays}-day free trial, then prepaid monthly or yearly access.
        </p>

        {params.checkout === "canceled" ? (
          <p className="mt-3 font-mono text-[11px] text-amber">
            Checkout canceled. No charge was made.
          </p>
        ) : null}

        <p className="mt-3 font-mono text-[11px] text-text">{PAYWALL_METHODS_COPY}</p>
        <p className="mt-2 max-w-2xl font-mono text-[11px] text-text-muted normal-case tracking-normal">
          {PAYWALL_RENEWAL_COPY}
        </p>

        {decision?.allowed ? (
          <p className="mt-3 font-mono text-[11px] text-online">
            Active clearance: {decision.status}.{" "}
            <Link href="/billing" className="text-text underline">
              Manage billing
            </Link>
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const price = `${formatBillingMoney(plan.amountCents, plan.currency)} / ${
              plan.key === "yearly" ? "year" : "month"
            }`;
            return (
              <section
                key={plan.key}
                className="border border-cta/40 bg-surface/40 px-5 py-5"
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
                  Prepaid access
                </p>
                <h2 className="mt-2 font-mono text-xl uppercase tracking-[0.1em] text-text">
                  {plan.label}
                </h2>
                <p className="mt-3 font-mono text-2xl text-text">{price}</p>
                <ul className="mt-4 space-y-2">
                  <li className="font-mono text-[11px] text-text-muted normal-case tracking-normal">
                    <span className="mr-2 text-text-dim">›</span>
                    Full Fictional cases + Investigation Mode
                  </li>
                  <li className="font-mono text-[11px] text-text-muted normal-case tracking-normal">
                    <span className="mr-2 text-text-dim">›</span>
                    Visa or Whish Money checkout
                  </li>
                  <li className="font-mono text-[11px] text-text-muted normal-case tracking-normal">
                    <span className="mr-2 text-text-dim">›</span>
                    Early renewals stack — never lose paid time
                  </li>
                </ul>
                <div className="mt-6">
                  {decision?.allowed ? (
                    <Link
                      href="/billing"
                      className="inline-flex border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
                    >
                      Manage subscription
                    </Link>
                  ) : session?.user ? (
                    <Link
                      href="/billing/paywall?callbackUrl=/fictional"
                      className="inline-flex border border-cta/50 bg-cta/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
                    >
                      Start trial or subscribe
                    </Link>
                  ) : (
                    <Link
                      href="/login?callbackUrl=/billing/paywall"
                      className="inline-flex border border-cta/50 bg-cta/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
                    >
                      Sign in to continue
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-6 max-w-2xl font-mono text-[10px] text-text-dim normal-case tracking-normal">
          Amounts come from `BILLING_*_AMOUNT_CENTS` / `CURRENCY` / `TRIAL_DAYS`
          — never hard-coded in UI. No Stripe. Whish endpoints must match
          official merchant docs before production.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

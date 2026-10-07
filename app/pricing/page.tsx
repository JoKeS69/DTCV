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
      <SiteHeader signedIn={Boolean(session?.user)} />
      <main className="deck-page relative max-w-5xl flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(94,196,182,0.1), transparent 65%), radial-gradient(ellipse 50% 40% at 85% 20%, rgba(138,153,173,0.12), transparent 60%), linear-gradient(180deg, #090c10 0%, #07090b 55%, transparent 100%)",
          }}
        />

        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim motion-fade-up">
          &gt; Fictional cases · CASE//NET
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold uppercase tracking-[0.1em] text-text motion-fade-up motion-fade-up-delay-1 md:text-5xl">
          CASE//NET
        </h1>
        <p className="mt-3 max-w-xl font-mono text-[13px] leading-relaxed text-text-muted normal-case tracking-normal motion-fade-up motion-fade-up-delay-2">
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

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {plans.map((plan, i) => {
            const price = `${formatBillingMoney(plan.amountCents, plan.currency)} / ${
              plan.key === "yearly" ? "year" : "month"
            }`;
            return (
              <section
                key={plan.key}
                className={[
                  "hud-panel",
                  i === 0 ? "motion-fade-up motion-fade-up-delay-2" : "motion-fade-up motion-fade-up-delay-3",
                ].join(" ")}
              >
                <div className="hud-panel-title">
                  <span>Prepaid access</span>
                </div>
                <div className="hud-panel-body">
                  <h2 className="font-display text-xl uppercase tracking-[0.1em] text-text">
                    {plan.label}
                  </h2>
                  <p className="mt-3 font-mono text-2xl text-text">{price}</p>
                  <ul className="mt-5 space-y-2.5">
                    <li className="font-mono text-[12px] text-text-muted normal-case tracking-normal">
                      <span className="mr-2 text-text-dim">›</span>
                      Full Fictional cases + Investigation Mode
                    </li>
                    <li className="font-mono text-[12px] text-text-muted normal-case tracking-normal">
                      <span className="mr-2 text-text-dim">›</span>
                      Visa or Whish Money checkout
                    </li>
                    <li className="font-mono text-[12px] text-text-muted normal-case tracking-normal">
                      <span className="mr-2 text-text-dim">›</span>
                      Early renewals stack — never lose paid time
                    </li>
                  </ul>
                  <div className="mt-6">
                    {decision?.allowed ? (
                      <Link href="/billing" className="deck-btn-sm deck-btn-sm--solid min-w-[10rem] max-w-none">
                        Manage subscription
                      </Link>
                    ) : session?.user ? (
                      <Link
                        href="/billing/paywall?callbackUrl=/fictional"
                        className="deck-btn-sm deck-btn-sm--solid min-w-[10rem] max-w-none"
                      >
                        Start trial or subscribe
                      </Link>
                    ) : (
                      <Link
                        href="/login?callbackUrl=/billing/paywall"
                        className="deck-btn-sm deck-btn-sm--solid min-w-[10rem] max-w-none"
                      >
                        Sign in to continue
                      </Link>
                    )}
                  </div>
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

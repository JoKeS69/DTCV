import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { UpgradeButton } from "@/components/billing/BillingActions";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  formatMoney,
  getPlanCatalog,
  getPaymentsMode,
} from "@/lib/payments/config";
import { paymentsStatusSummary } from "@/lib/payments";
import { getUserEntitlements } from "@/lib/payments/entitlements";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "DETECTIVE clearance tiers — Free core access and Investigator Pro via Visa. Amounts configured by environment.",
  path: "/pricing",
});

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : null;
  const plans = getPlanCatalog();
  const status = paymentsStatusSummary();
  const mode = getPaymentsMode();

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
          &gt; Clearance tiers · DETECTIVE
        </p>
        <h1 className="mt-2 font-mono text-3xl font-semibold uppercase tracking-[0.12em] text-text md:text-4xl">
          DETECTIVE
        </h1>
        <p className="mt-2 max-w-xl font-mono text-[12px] text-text-muted normal-case tracking-normal">
          Free core stays open. Investigator Pro unlocks the full training
          library, advanced tools, and premium challenges — paid with Visa.
        </p>

        {params.checkout === "canceled" ? (
          <p className="mt-3 font-mono text-[11px] text-amber">
            Checkout canceled. No charge was made.
          </p>
        ) : null}

        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          Mode {mode}
          {" · "}
          Provider {status.provider}
          {" · "}
          Visa {status.acceptsVisa ? "enabled" : "off"}
          {status.testMode ? " · TEST CHECKOUT ACTIVE" : ""}
        </p>

        {entitlements?.isPremium ? (
          <p className="mt-3 font-mono text-[11px] text-online">
            Active clearance: {entitlements.label}.{" "}
            <Link href="/billing" className="text-text underline">
              Manage billing
            </Link>
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isPro = plan.key === "investigator_pro";
            const price =
              plan.amountCents === 0
                ? "Free"
                : `${formatMoney(plan.amountCents, plan.currency)} / ${plan.interval}`;
            return (
              <section
                key={plan.key}
                className={[
                  "border bg-surface/40 px-5 py-5",
                  isPro ? "border-cta/40" : "border-border",
                ].join(" ")}
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
                  {isPro ? "Premium clearance" : "Core access"}
                </p>
                <h2 className="mt-2 font-mono text-xl uppercase tracking-[0.1em] text-text">
                  {plan.label}
                </h2>
                <p className="mt-3 font-mono text-2xl text-text">{price}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="font-mono text-[11px] text-text-muted normal-case tracking-normal"
                    >
                      <span className="mr-2 text-text-dim">›</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {!isPro ? (
                    <Link
                      href="/fictional"
                      className="inline-flex border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text hover:border-border-strong"
                    >
                      Continue free
                    </Link>
                  ) : entitlements?.isPremium ? (
                    <Link
                      href="/billing"
                      className="inline-flex border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
                    >
                      Manage subscription
                    </Link>
                  ) : session?.user ? (
                    <UpgradeButton label="Pay with Visa" />
                  ) : (
                    <Link
                      href="/login?callbackUrl=/pricing"
                      className="inline-flex border border-cta/50 bg-cta/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
                    >
                      Sign in to upgrade
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-6 max-w-2xl font-mono text-[10px] text-text-dim normal-case tracking-normal">
          Amounts come from environment settings (`PAYMENTS_PRO_AMOUNT_CENTS`),
          not hard-coded UI constants. Card data is processed through the
          payments provider abstraction (test Visa or live Visa gateway).
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

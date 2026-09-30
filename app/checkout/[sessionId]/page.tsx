import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CheckoutForm } from "@/components/billing/CheckoutForm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { formatMoney, getPaymentsMode } from "@/lib/payments/config";
import { paymentsStatusSummary } from "@/lib/payments";
import { getPrisma } from "@/lib/db";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Checkout");

type Props = { params: Promise<{ sessionId: string }> };

export default async function CheckoutPage({ params }: Props) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout/${sessionId}`);
  }

  const checkout = await getPrisma().checkoutSession.findUnique({
    where: { id: sessionId },
  });
  if (!checkout || checkout.userId !== session.user.id) notFound();

  if (checkout.status === "COMPLETED") {
    redirect("/billing?checkout=success");
  }

  const amountLabel = formatMoney(checkout.amountCents, checkout.currency);
  const status = paymentsStatusSummary();

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <SiteHeader />
      <main className="deck-page max-w-lg flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
          &gt; Visa authorization · DETECTIVE
        </p>
        <h1 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.1em] text-text">
          Checkout
        </h1>
        <p className="mt-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
          Investigator Pro · {amountLabel} / billing cycle. Visa cards only.
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-2 border border-border bg-surface/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">
          <div>
            <dt className="text-text-dim">Session</dt>
            <dd className="mt-1 text-text">{checkout.id.slice(0, 12)}…</dd>
          </div>
          <div>
            <dt className="text-text-dim">Provider</dt>
            <dd className="mt-1 text-text">{checkout.provider}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Mode</dt>
            <dd className="mt-1 text-text">{getPaymentsMode()}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Status</dt>
            <dd className="mt-1 text-text">{checkout.status}</dd>
          </div>
        </dl>

        <div className="mt-4 border border-border bg-surface/50 px-4 py-4">
          {checkout.status !== "OPEN" ? (
            <p className="font-mono text-[11px] text-text-dim">
              This session is {checkout.status}.{" "}
              <Link href="/pricing" className="text-text underline">
                Return to pricing
              </Link>
            </p>
          ) : (
            <CheckoutForm
              sessionId={checkout.id}
              amountLabel={amountLabel}
              testMode={status.testMode}
            />
          )}
        </div>

        <p className="mt-4 font-mono text-[10px] text-text-dim">
          <Link href="/pricing" className="hover:text-text">
            ← Back to pricing
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

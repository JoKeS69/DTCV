import Link from "next/link";
import { formatBillingMoney } from "@/lib/billing/config";
import type { AccessDecision } from "@/lib/billing/access";

type PaymentRow = {
  id: string;
  provider: string;
  plan: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  cardBrand: string | null;
};

export function SubscriptionSection({
  decision,
  payments,
}: {
  decision: AccessDecision;
  payments: PaymentRow[];
}) {
  return (
    <section className="mt-6 border border-border bg-surface/40">
      <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        &gt; Subscription · Fictional cases
      </header>
      <dl className="grid gap-3 px-4 py-4 font-mono text-[11px] uppercase tracking-[0.12em] sm:grid-cols-2">
        <div>
          <dt className="text-text-dim">Status</dt>
          <dd className="mt-1 text-text">{decision.status}</dd>
        </div>
        <div>
          <dt className="text-text-dim">Trial ends</dt>
          <dd className="mt-1 normal-case tracking-normal text-text">
            {decision.trialEndsAt
              ? decision.trialEndsAt.toISOString()
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-text-dim">Access until</dt>
          <dd className="mt-1 normal-case tracking-normal text-text">
            {decision.accessUntil
              ? decision.accessUntil.toISOString()
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-text-dim">Plan</dt>
          <dd className="mt-1 text-text">{decision.billingPlan ?? "—"}</dd>
        </div>
      </dl>
      <div className="border-t border-border px-4 py-3">
        <Link
          href="/billing/paywall?callbackUrl=/billing"
          className="border border-cta/50 bg-cta/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text"
        >
          Renew
        </Link>
      </div>
      <div className="border-t border-border">
        <header className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          Payment history
        </header>
        {payments.length === 0 ? (
          <p className="px-4 pb-4 font-mono text-[11px] text-text-muted normal-case tracking-normal">
            No payments yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap justify-between gap-2 px-4 py-2 font-mono text-[11px] text-text-muted"
              >
                <span className="uppercase tracking-[0.12em]">
                  {p.provider}
                  {p.cardBrand ? ` · ${p.cardBrand}` : ""} · {p.plan}
                </span>
                <span className="normal-case tracking-normal">
                  {formatBillingMoney(p.amountCents, p.currency)} · {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

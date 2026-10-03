"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  startFreeTrialAction,
  startPrepaidCheckout,
} from "@/app/actions/billing";
import {
  PAYWALL_METHODS_COPY,
  PAYWALL_RENEWAL_COPY,
} from "@/lib/billing/config";

type PlanOption = {
  key: "monthly" | "yearly";
  label: string;
  priceLabel: string;
};

export function PaywallPanel({
  trialDays,
  hasUsedTrial,
  plans,
  callbackUrl = "/fictional",
}: {
  trialDays: number;
  hasUsedTrial: boolean;
  plans: PlanOption[];
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<"monthly" | "yearly">(
    plans[0]?.key ?? "monthly",
  );
  const [termsOk, setTermsOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string } | void>) {
    setError(null);
    if (!termsOk) {
      setError("Accept the Terms before continuing");
      return;
    }
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) {
        setError(result.error || "Request failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="border border-border bg-surface/40 px-4 py-5 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
        &gt; Fictional cases clearance
      </p>
      <h2 className="mt-2 font-mono text-xl font-semibold uppercase tracking-[0.1em] text-text">
        Unlock Investigation Mode
      </h2>
      <p className="mt-2 max-w-xl font-mono text-[12px] text-text-muted normal-case tracking-normal">
        Play original whodunit cases, interrogate suspects, and run field agents.
        Start a {trialDays}-day free trial (no payment method), or subscribe —
        {plans.map((p) => ` ${p.priceLabel}`).join(" ·")}.
      </p>
      <p className="mt-3 font-mono text-[11px] text-text">
        {PAYWALL_METHODS_COPY}
      </p>
      <p className="mt-2 font-mono text-[11px] text-text-muted normal-case tracking-normal">
        {PAYWALL_RENEWAL_COPY}
      </p>

      <label className="mt-4 flex items-start gap-2 font-mono text-[11px] text-text-muted normal-case tracking-normal">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={termsOk}
          onChange={(e) => setTermsOk(e.target.checked)}
        />
        <span>
          I accept the{" "}
          <Link href="/legal/terms" className="text-text underline">
            Terms
          </Link>{" "}
          and understand this is a fictional training product.
        </span>
      </label>

      {error ? (
        <p className="mt-3 font-mono text-[11px] text-danger">{error}</p>
      ) : null}

      {!hasUsedTrial ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={pending}
            className="border border-cta/50 bg-cta/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text hover:bg-cta/25 disabled:opacity-50"
            onClick={() => run(() => startFreeTrialAction())}
          >
            {pending ? "Starting…" : `Start free trial (${trialDays} days)`}
          </button>
        </div>
      ) : (
        <p className="mt-4 font-mono text-[11px] text-amber">
          Free trial already used on this account. Choose a plan below.
        </p>
      )}

      <div className="mt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
          Plan
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {plans.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlan(p.key)}
              className={[
                "border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                plan === p.key
                  ? "border-cta/50 bg-cta/15 text-text"
                  : "border-border text-text-muted",
              ].join(" ")}
            >
              {p.label} · {p.priceLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text hover:bg-surface disabled:opacity-50"
          onClick={() =>
            run(() => startPrepaidCheckout({ plan, method: "card" }))
          }
        >
          Pay with Visa
        </button>
        <button
          type="button"
          disabled={pending}
          className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text hover:bg-surface disabled:opacity-50"
          onClick={() =>
            run(() => startPrepaidCheckout({ plan, method: "whish" }))
          }
        >
          Pay with Whish
        </button>
        <Link
          href={callbackUrl}
          className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim"
        >
          Back
        </Link>
      </div>
    </section>
  );
}

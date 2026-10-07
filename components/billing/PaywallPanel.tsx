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
import {
  CONSENT_COOKIE,
  LEGAL_POLICY_VERSION,
} from "@/lib/legal/policy";

type PlanOption = {
  key: "monthly" | "yearly";
  label: string;
  priceLabel: string;
};

async function recordTermsConsent(): Promise<boolean> {
  const res = await fetch("/api/legal/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agree: true }),
  });
  if (!res.ok) return false;
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(LEGAL_POLICY_VERSION)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  return true;
}

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
      const consented = await recordTermsConsent();
      if (!consented) {
        setError("Could not record Terms acceptance. Try again.");
        return;
      }
      const result = await action();
      if (result && !result.ok) {
        setError(result.error || "Request failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="hud-panel motion-fade-up overflow-hidden">
      <div className="hud-panel-title">
        <span>&gt; Fictional cases clearance</span>
      </div>
      <div className="hud-panel-body space-y-4">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.08em] text-text md:text-3xl">
          Unlock Investigation Mode
        </h2>
        <p className="max-w-xl font-mono text-[13px] leading-relaxed text-text-muted normal-case tracking-normal">
          Play original whodunit cases, interrogate suspects, and run field agents.
          Start a {trialDays}-day free trial (no payment method), or subscribe —
          {plans.map((p) => ` ${p.priceLabel}`).join(" ·")}.
        </p>
        <p className="font-mono text-[12px] text-text">{PAYWALL_METHODS_COPY}</p>
        <p className="font-mono text-[12px] text-text-muted normal-case tracking-normal">
          {PAYWALL_RENEWAL_COPY}
        </p>

        <label className="flex items-start gap-2.5 font-mono text-[12px] text-text-muted normal-case tracking-normal">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--online)]"
            checked={termsOk}
            onChange={(e) => setTermsOk(e.target.checked)}
          />
          <span>
            I accept the{" "}
            <Link href="/legal/terms" className="text-text underline underline-offset-2">
              Terms
            </Link>{" "}
            and understand this is a fictional training product.
          </span>
        </label>

        {error ? (
          <p className="font-mono text-[12px] text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {!hasUsedTrial ? (
          <div>
            <button
              type="button"
              disabled={pending}
              className="deck-btn-sm deck-btn-sm--solid min-w-[12rem] max-w-none px-5"
              onClick={() => run(() => startFreeTrialAction())}
            >
              {pending ? "Starting…" : `Start free trial (${trialDays} days)`}
            </button>
          </div>
        ) : (
          <p className="font-mono text-[12px] text-amber">
            Free trial already used on this account. Choose a plan below.
          </p>
        )}

        <div>
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
                  "border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                  plan === p.key
                    ? "border-cta/50 bg-cta/15 text-text"
                    : "border-border text-text-muted hover:border-border-strong",
                ].join(" ")}
              >
                {p.label} · {p.priceLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            className="deck-btn-sm min-w-[8rem] max-w-none"
            onClick={() =>
              run(() => startPrepaidCheckout({ plan, method: "card" }))
            }
          >
            Pay with Visa
          </button>
          <button
            type="button"
            disabled={pending}
            className="deck-btn-sm min-w-[8rem] max-w-none"
            onClick={() =>
              run(() => startPrepaidCheckout({ plan, method: "whish" }))
            }
          >
            Pay with Whish
          </button>
          <Link href={callbackUrl} className="deck-btn-sm min-w-[6rem] max-w-none">
            Back
          </Link>
        </div>
      </div>
    </section>
  );
}

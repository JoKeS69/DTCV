"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmVisaCheckout } from "@/app/actions/billing";

export function CheckoutForm({
  sessionId,
  amountLabel,
  testMode,
}: {
  sessionId: string;
  amountLabel: string;
  testMode: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pan, setPan] = useState(testMode ? "4111 1111 1111 1111" : "");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState("2030");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("Demo Detective");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            const result = await confirmVisaCheckout({
              sessionId,
              pan,
              expMonth,
              expYear,
              cvc,
              cardholderName: name,
            });
            if (result && !result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          } catch {
            // redirect throws
          }
        });
      }}
    >
      {testMode ? (
        <p className="border border-amber/40 bg-amber/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
          Test mode · Visa only · use 4111 1111 1111 1111 · decline 4000 0000
          0000 0002
        </p>
      ) : null}

      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Cardholder
        <input
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="cc-name"
          required
        />
      </label>

      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Visa number
        <input
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] tracking-[0.12em] text-text"
          value={pan}
          onChange={(e) => setPan(e.target.value)}
          inputMode="numeric"
          autoComplete="cc-number"
          required
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          MM
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={expMonth}
            onChange={(e) => setExpMonth(e.target.value)}
            autoComplete="cc-exp-month"
            required
          />
        </label>
        <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          YYYY
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={expYear}
            onChange={(e) => setExpYear(e.target.value)}
            autoComplete="cc-exp-year"
            required
          />
        </label>
        <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          CVC
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            autoComplete="cc-csc"
            required
          />
        </label>
      </div>

      {error ? (
        <p className="font-mono text-[11px] text-danger">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full border border-cta/50 bg-cta/15 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-text hover:bg-cta/25 disabled:opacity-50"
      >
        {pending ? "Authorizing Visa…" : `Pay ${amountLabel} · Activate Pro`}
      </button>
    </form>
  );
}

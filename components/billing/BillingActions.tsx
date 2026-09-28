"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  cancelSubscriptionAction,
  startInvestigatorProCheckout,
} from "@/app/actions/billing";

export function UpgradeButton({ label = "Upgrade with Visa" }: { label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="border border-cta/50 bg-cta/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text hover:bg-cta/25 disabled:opacity-50"
      onClick={() => {
        startTransition(async () => {
          const result = await startInvestigatorProCheckout();
          if (result && !result.ok) window.alert(result.error);
        });
      }}
    >
      {pending ? "Opening checkout…" : label}
    </button>
  );
}

export function CancelSubscriptionButton({
  immediate = false,
}: {
  immediate?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="border border-danger/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-danger disabled:opacity-50"
      onClick={() => {
        if (
          !window.confirm(
            immediate
              ? "Cancel Investigator Pro immediately?"
              : "Cancel at period end?",
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await cancelSubscriptionAction(immediate);
          if (!result.ok) {
            window.alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      {pending
        ? "…"
        : immediate
          ? "Cancel now"
          : "Cancel at period end"}
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adminExtendAccessAction,
  adminSetCompedAction,
} from "@/app/actions/billing-admin";

export function AdminBillingControls({
  userId,
  comped,
}: {
  userId: string;
  comped: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("30");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2 space-y-2 font-mono text-[10px]">
      {error ? <p className="text-danger">{error}</p> : null}
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
        className="w-full border border-border bg-bg px-2 py-1 text-text"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="border border-border px-2 py-1 text-text disabled:opacity-50"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await adminSetCompedAction({
                userId,
                comped: !comped,
                reason,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          {comped ? "Revoke comped" : "Grant comped"}
        </button>
        <input
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-16 border border-border bg-bg px-2 py-1 text-text"
          aria-label="Extend days"
        />
        <button
          type="button"
          disabled={pending}
          className="border border-border px-2 py-1 text-text disabled:opacity-50"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await adminExtendAccessAction({
                userId,
                days: Number(days),
                reason,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          Extend days
        </button>
      </div>
    </div>
  );
}

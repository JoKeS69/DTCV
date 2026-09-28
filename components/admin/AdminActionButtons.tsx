"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AdminActionButton({
  label,
  onAction,
  danger,
}: {
  label: string;
  onAction: () => Promise<{ ok: boolean; error?: string }>;
  danger?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={[
        "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] disabled:opacity-50",
        danger
          ? "border-danger/50 text-danger"
          : "border-border text-text hover:border-border-strong",
      ].join(" ")}
      onClick={() => {
        startTransition(async () => {
          const result = await onAction();
          if (!result.ok) {
            window.alert(result.error ?? "Failed");
            return;
          }
          router.refresh();
        });
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}

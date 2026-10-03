"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCaseAction } from "@/app/actions/pb-case";

export function DeleteCaseButton({
  caseId,
  title,
  redirectTo,
}: {
  caseId: string;
  title: string;
  /** When set, navigate here after successful delete (detail page). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const ok = window.confirm(
            `Delete case “${title}”?\n\nThis unpublishes any public /cases row and permanently deletes the research draft (claims, people, runs).`,
          );
          if (!ok) return;
          start(async () => {
            const res = await deleteCaseAction(caseId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setError(null);
            if (redirectTo) {
              router.push(redirectTo);
            }
            router.refresh();
          });
        }}
        className="border border-danger/50 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <span className="font-mono text-[10px] text-danger">{error}</span>
      ) : null}
    </div>
  );
}

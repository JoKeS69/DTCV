"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startOrContinueInvestigation } from "@/app/actions/fictional";

export function StartInvestigationButton({
  fictionalCaseId,
  slug,
  signedIn,
  hasInvestigation,
  submitted,
}: {
  fictionalCaseId: string;
  slug: string;
  signedIn: boolean;
  hasInvestigation: boolean;
  submitted: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (submitted) {
    return (
      <a
        href={`/fictional/${slug}/result`}
        className="inline-flex border border-online/50 bg-online/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-online/20"
      >
        View result
      </a>
    );
  }

  if (!signedIn) {
    return (
      <button
        type="button"
        className="border border-cta/50 bg-cta/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20"
        onClick={() =>
          router.push(
            `/login?callbackUrl=${encodeURIComponent(`/fictional/${slug}`)}`,
          )
        }
      >
        Sign in to investigate
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="border border-cta/50 bg-cta/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20 disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            const result = await startOrContinueInvestigation(
              fictionalCaseId,
              slug,
            );
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setError(null);
            router.refresh();
            document
              .getElementById("case-brief")
              ?.scrollIntoView({ behavior: "smooth" });
          });
        }}
      >
        {pending
          ? "Opening…"
          : hasInvestigation
            ? "Continue investigation"
            : "Start investigation"}
      </button>
      {error ? (
        <span className="font-mono text-[10px] text-danger">{error}</span>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCaseAction } from "@/app/actions/pb-case";

export function CreateCaseForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 border border-border bg-surface/30 p-3 md:grid-cols-[1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await createCaseAction(fd);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setError(null);
          router.push(`/pb-case/cases/${res.id}`);
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Seed title
        <input
          name="title"
          required
          minLength={3}
          placeholder="e.g. hariri 2005"
          title="Working seed only — research run replaces this with a professional title"
          className="border border-border bg-bg px-2 py-1.5 text-[12px] text-text normal-case tracking-normal"
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full border border-border bg-accent/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text hover:bg-accent/30 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create case"}
        </button>
      </div>
      {error ? (
        <p className="md:col-span-2 font-mono text-[11px] text-danger">{error}</p>
      ) : (
        <p className="md:col-span-2 font-mono text-[10px] text-text-dim normal-case tracking-normal">
          Only a seed title is required. Date and location come from research.
          After Run research, the worker writes the polished display title.
        </p>
      )}
    </form>
  );
}

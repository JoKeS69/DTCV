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
      className="grid gap-3 border border-border bg-surface/30 p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
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
        Title
        <input
          name="title"
          required
          minLength={3}
          className="border border-border bg-bg px-2 py-1.5 text-[12px] text-text normal-case tracking-normal"
        />
      </label>
      <label className="grid gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Event date
        <input
          name="eventDateText"
          placeholder="14 February 2005"
          className="border border-border bg-bg px-2 py-1.5 text-[12px] text-text normal-case tracking-normal"
        />
      </label>
      <label className="grid gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Location
        <input
          name="location"
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
        <p className="md:col-span-4 font-mono text-[11px] text-danger">{error}</p>
      ) : null}
    </form>
  );
}

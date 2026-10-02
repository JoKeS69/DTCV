"use client";

import { useState, useTransition } from "react";

export function TakedownButton({
  caseId,
  caseSlug,
}: {
  caseId?: string;
  caseSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted underline hover:text-text"
      >
        Request takedown
      </button>
    );
  }

  return (
    <form
      className="mt-2 grid max-w-md gap-2 border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await fetch("/api/legal/takedown", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caseId,
              caseSlug,
              reason: String(fd.get("reason") || ""),
              contact: String(fd.get("contact") || ""),
              url: String(fd.get("url") || ""),
            }),
          });
          setMsg(res.ok ? "Request submitted." : "Could not submit.");
          if (res.ok) setOpen(false);
        });
      }}
    >
      <textarea
        name="reason"
        required
        minLength={10}
        placeholder="Reason"
        className="border border-border bg-bg px-2 py-1.5 font-mono text-[12px]"
        rows={3}
      />
      <input
        name="contact"
        type="email"
        placeholder="Contact email (hashed at rest)"
        className="border border-border bg-bg px-2 py-1.5 font-mono text-[12px]"
      />
      <input
        name="url"
        type="url"
        placeholder="Related URL (optional)"
        className="border border-border bg-bg px-2 py-1.5 font-mono text-[12px]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted"
        >
          Cancel
        </button>
      </div>
      {msg ? (
        <p className="font-mono text-[11px] text-text-muted">{msg}</p>
      ) : null}
    </form>
  );
}

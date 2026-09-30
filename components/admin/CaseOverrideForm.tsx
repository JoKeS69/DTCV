"use client";

import { useState, useTransition } from "react";
import { adminSetCaseOverride } from "@/app/actions/admin-sync";

export function CaseOverrideForm({
  caseId,
  initialHide,
  initialNote,
}: {
  caseId: string;
  initialHide: boolean;
  initialNote: string;
}) {
  const [hide, setHide] = useState(initialHide);
  const [note, setNote] = useState(initialNote);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-2 border border-border bg-surface/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await adminSetCaseOverride(caseId, hide, note);
          setMsg(res.ok ? "Saved override" : res.error);
        });
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
        Admin override (sync does not overwrite)
      </p>
      <label className="flex items-center gap-2 font-mono text-[11px]">
        <input
          type="checkbox"
          checked={hide}
          onChange={(e) => setHide(e.target.checked)}
        />
        Hide from public
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Internal note"
        className="w-full border border-border bg-bg px-2 py-1 font-mono text-[11px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save override"}
      </button>
      {msg ? <p className="font-mono text-[10px] text-text-muted">{msg}</p> : null}
    </form>
  );
}

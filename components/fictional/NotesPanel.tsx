"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addInvestigationNote } from "@/app/actions/fictional";

export function NotesPanel({
  investigationId,
  slug,
  notes,
  locked,
}: {
  investigationId: string;
  slug: string;
  notes: { id: string; body: string; createdAt: Date | string }[];
  locked: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {!locked ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await addInvestigationNote({
                investigationId,
                body,
                slug,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setBody("");
              setError(null);
              router.refresh();
            });
          }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Private investigation notes…"
            className="w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text normal-case tracking-normal"
          />
          {error ? (
            <p className="font-mono text-[10px] text-danger">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
          >
            {pending ? "Saving…" : "Add note"}
          </button>
        </form>
      ) : (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          Notes locked after submission.
        </p>
      )}

      {notes.length === 0 ? (
        <p className="font-mono text-[11px] text-text-dim">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="border border-border/80 px-3 py-2 font-mono text-[12px] text-text-muted normal-case tracking-normal whitespace-pre-wrap"
            >
              <p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">
                {new Date(note.createdAt).toISOString()}
              </p>
              <p className="mt-1">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

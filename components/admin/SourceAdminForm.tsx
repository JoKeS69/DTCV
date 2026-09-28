"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upsertCaseSource } from "@/app/actions/admin";

export function SourceAdminForm({
  caseId,
  initial,
}: {
  caseId: string;
  initial?: {
    id?: string;
    title?: string;
    url?: string;
    publisher?: string;
    citationNote?: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [citationNote, setCitationNote] = useState(initial?.citationNote ?? "");

  return (
    <form
      className="space-y-2 border border-border bg-bg/50 px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await upsertCaseSource({
            id: initial?.id,
            caseId,
            title,
            url,
            publisher: publisher || null,
            citationNote: citationNote || null,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(null);
          if (!initial?.id) {
            setTitle("");
            setUrl("");
            setPublisher("");
            setCitationNote("");
          }
          router.refresh();
        });
      }}
    >
      <input
        className="w-full border border-border bg-bg px-2 py-1 font-mono text-[12px] text-text"
        placeholder="Source title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        className="w-full border border-border bg-bg px-2 py-1 font-mono text-[12px] text-text"
        placeholder="https://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <input
        className="w-full border border-border bg-bg px-2 py-1 font-mono text-[12px] text-text"
        placeholder="Publisher"
        value={publisher}
        onChange={(e) => setPublisher(e.target.value)}
      />
      <textarea
        className="w-full border border-border bg-bg px-2 py-1 font-mono text-[12px] text-text"
        placeholder="Citation note"
        rows={2}
        value={citationNote}
        onChange={(e) => setCitationNote(e.target.value)}
      />
      {error ? (
        <p className="font-mono text-[10px] text-danger">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
      >
        {pending ? "Saving…" : initial?.id ? "Update source" : "Add source"}
      </button>
    </form>
  );
}

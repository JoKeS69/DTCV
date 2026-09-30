"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createDiscussion } from "@/app/actions/community";

export function CreateDiscussionForm({
  caseId,
  caseSlug,
  signedIn,
}: {
  caseId: string;
  caseSlug: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <button
        type="button"
        className="border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20"
        onClick={() =>
          router.push(
            `/login?callbackUrl=${encodeURIComponent(`/cases/${caseSlug}`)}`,
          )
        }
      >
        Sign in to start discussion
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20"
        onClick={() => setOpen(true)}
      >
        Start discussion
      </button>
    );
  }

  return (
    <form
      className="space-y-3 border border-border bg-bg/60 px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createDiscussion({
            caseId,
            title,
            body,
            contentLabel: "USER_THEORY",
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(null);
          setTitle("");
          setBody("");
          setOpen(false);
          if (result.id) router.push(`/discussions/${result.id}`);
          else router.refresh();
        });
      }}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-amber">
        USER THEORY — not verified. No guilt accusations.
      </p>
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={160}
          className="mt-1 w-full border border-border bg-surface px-3 py-2 font-mono text-[12px] text-text normal-case tracking-normal"
        />
      </label>
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Opening post
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={8000}
          rows={5}
          className="mt-1 w-full border border-border bg-surface px-3 py-2 font-mono text-[12px] text-text normal-case tracking-normal"
        />
      </label>
      {error ? (
        <p className="font-mono text-[10px] text-danger">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post discussion"}
        </button>
        <button
          type="button"
          className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

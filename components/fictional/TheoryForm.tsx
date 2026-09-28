"use client";

import { useState, useTransition } from "react";
import { submitTheory } from "@/app/actions/fictional";

type SuspectOption = { id: string; code: string; name: string };

export function TheoryForm({
  investigationId,
  slug,
  suspects,
  locked,
}: {
  investigationId: string;
  slug: string;
  suspects: SuspectOption[];
  locked: boolean;
}) {
  const [suspectId, setSuspectId] = useState("");
  const [motive, setMotive] = useState("");
  const [timeline, setTimeline] = useState("");
  const [evidenceInterpretation, setEvidenceInterpretation] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (locked) {
    return (
      <p className="font-mono text-[11px] text-text-dim">
        Theory already submitted.{" "}
        <a href={`/fictional/${slug}/result`} className="text-cta hover:underline">
          View result →
        </a>
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const result = await submitTheory({
            investigationId,
            slug,
            suspectId,
            motive,
            timeline,
            evidenceInterpretation,
            reasoning,
          });
          // redirect throws on success; only surface errors
          if (result && !result.ok) setError(result.error);
        });
      }}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber">
        Scoring is server-side only. Solution is never sent to the browser before
        submit.
      </p>

      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Culprit (suspect)
        <select
          required
          value={suspectId}
          onChange={(e) => setSuspectId(e.target.value)}
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
        >
          <option value="">Select suspect…</option>
          {suspects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="Motive"
        value={motive}
        onChange={setMotive}
        placeholder="Why did they do it?"
      />
      <Field
        label="Timeline"
        value={timeline}
        onChange={setTimeline}
        placeholder="Sequence of key events…"
      />
      <Field
        label="Evidence interpretation"
        value={evidenceInterpretation}
        onChange={setEvidenceInterpretation}
        placeholder="Cite evidence codes (e.g. E01, E06) and what they mean…"
      />
      <Field
        label="Reasoning"
        value={reasoning}
        onChange={setReasoning}
        placeholder="How the pieces connect…"
      />

      {error ? (
        <p className="font-mono text-[10px] text-danger">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !suspectId}
        className="border border-cta/50 bg-cta/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20 disabled:opacity-50"
      >
        {pending ? "Scoring…" : "Submit theory"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
      {label}
      <textarea
        required
        minLength={10}
        maxLength={4000}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text normal-case tracking-normal"
      />
    </label>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  generateFictionalInvestigationAction,
  publishInvestigationCaseAction,
  seedSampleInvestigationCasesAction,
  unpublishInvestigationCaseAction,
} from "@/app/actions/investigation";

export type FictionalCaseRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  teaser: string;
};

export function FictionalCaseGeneratePanel({
  cases,
}: {
  cases: FictionalCaseRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [preferLlm, setPreferLlm] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    setMessage(null);
    const fd = new FormData();
    fd.set("prompt", prompt);
    fd.set("preferLlm", preferLlm ? "1" : "0");
    startTransition(async () => {
      const res = await generateFictionalInvestigationAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(
        `Draft created: ${res.title} (${res.source}). Publish sends it only to Fictional cases.`,
      );
      setPrompt("");
    });
  }

  function publish(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await publishInvestigationCaseAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(`Published to Fictional cases: /fictional/investigate/${res.slug}`);
    });
  }

  function unpublish(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await unpublishInvestigationCaseAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Unpublished (removed from Fictional cases list).");
    });
  }

  function seedSamples() {
    setError(null);
    startTransition(async () => {
      const res = await seedSampleInvestigationCasesAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(`Seeded/updated ${res.upserted} original sample cases.`);
    });
  }

  return (
    <section className="border border-border bg-surface/40 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
        Fictional case generate
      </p>
      <h2 className="mt-1 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-text">
        Investigation Mode drafts
      </h2>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-text-muted normal-case tracking-normal">
        AI / template worker builds an original case: suspects, evidence scenes,
        plot, alibis. Publishing goes <strong>only</strong> to Fictional cases —
        never into public Cases.
      </p>

      <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Optional theme hint
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          maxLength={400}
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text outline-none focus:border-border-strong"
          placeholder="e.g. mountain radio station · keep original / no real people"
        />
      </label>

      <label className="mt-2 flex items-center gap-2 font-mono text-[11px] text-text-muted">
        <input
          type="checkbox"
          checked={preferLlm}
          onChange={(e) => setPreferLlm(e.target.checked)}
        />
        Prefer LLM when INVESTIGATION_OPENAI_API_KEY is set (else templates)
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={generate}
          className="border border-border-strong bg-surface-elevated px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:border-cta disabled:opacity-40"
        >
          Generate draft
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={seedSamples}
          className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted hover:text-text disabled:opacity-40"
        >
          Seed 3 samples
        </button>
      </div>

      {error ? (
        <p className="mt-3 font-mono text-[11px] text-danger">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-3 font-mono text-[11px] text-online">{message}</p>
      ) : null}

      <div className="mt-4 border-t border-border pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          Drafts / published ({cases.length})
        </p>
        {cases.length === 0 ? (
          <p className="mt-2 font-mono text-[11px] text-text-dim">
            No investigation cases yet. Generate or seed samples.
          </p>
        ) : (
          <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {cases.map((c) => (
              <li
                key={c.id}
                className="border border-border bg-bg/40 px-3 py-2 font-mono text-[11px]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-text">{c.title}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-text-dim">
                      {c.status} · {c.slug}
                    </p>
                    <p className="mt-1 text-text-muted normal-case tracking-normal line-clamp-2">
                      {c.teaser}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {c.status === "published" ? (
                      <>
                        <Link
                          href={`/fictional/investigate/${c.slug}`}
                          className="text-online hover:underline"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => unpublish(c.id)}
                          className="text-left text-text-dim hover:text-text"
                        >
                          Unpublish
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => publish(c.id)}
                        className="text-left text-amber hover:underline"
                      >
                        Publish to Fictional
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

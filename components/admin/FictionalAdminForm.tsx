"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upsertFictionalCase } from "@/app/actions/admin";
import type { FictionalDifficulty } from "@/lib/generated/prisma/client";

type Values = {
  id?: string;
  caseCode: string;
  title: string;
  slug: string;
  synopsis: string;
  setting: string;
  difficulty: FictionalDifficulty;
  estimatedMinutes: string;
};

export function FictionalAdminForm({ initial }: { initial?: Partial<Values> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({
    id: initial?.id,
    caseCode: initial?.caseCode ?? "",
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    synopsis: initial?.synopsis ?? "",
    setting: initial?.setting ?? "",
    difficulty: initial?.difficulty ?? "NOVICE",
    estimatedMinutes: initial?.estimatedMinutes ?? "45",
  });

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <form
      className="space-y-3 border border-border bg-surface/40 px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await upsertFictionalCase({
            id: values.id,
            caseCode: values.caseCode,
            title: values.title,
            slug: values.slug || undefined,
            synopsis: values.synopsis,
            setting: values.setting || null,
            difficulty: values.difficulty,
            estimatedMinutes: values.estimatedMinutes
              ? Number(values.estimatedMinutes)
              : null,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(null);
          router.push(`/admin/fictional/${result.id}`);
          router.refresh();
        });
      }}
    >
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Case code
        <input
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          value={values.caseCode}
          onChange={(e) => set("caseCode", e.target.value)}
          required
        />
      </label>
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Title
        <input
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </label>
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Slug
        <input
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          value={values.slug}
          onChange={(e) => set("slug", e.target.value)}
        />
      </label>
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Synopsis (must stay clearly fictional)
        <textarea
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          rows={5}
          value={values.synopsis}
          onChange={(e) => set("synopsis", e.target.value)}
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          Setting
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.setting}
            onChange={(e) => set("setting", e.target.value)}
          />
        </label>
        <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          Difficulty
          <select
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.difficulty}
            onChange={(e) =>
              set("difficulty", e.target.value as FictionalDifficulty)
            }
          >
            {["NOVICE", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          Est. minutes
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.estimatedMinutes}
            onChange={(e) => set("estimatedMinutes", e.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="font-mono text-[10px] text-danger">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
      >
        {pending ? "Saving…" : values.id ? "Save fictional case" : "Create fictional case"}
      </button>
    </form>
  );
}

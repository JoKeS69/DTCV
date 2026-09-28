"use client";

import { useState } from "react";
import { SourceAdminForm } from "@/components/admin/SourceAdminForm";

export function SourcesAddPanel({
  cases,
}: {
  cases: { id: string; caseCode: string; title: string }[];
}) {
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");

  if (cases.length === 0) {
    return (
      <p className="font-mono text-[11px] text-text-dim">
        No cases yet. Create a case first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Target case
        <select
          className="mt-1 w-full border border-border bg-bg px-2 py-1 font-mono text-[12px] text-text"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.caseCode} · {c.title}
            </option>
          ))}
        </select>
      </label>
      {caseId ? <SourceAdminForm key={caseId} caseId={caseId} /> : null}
    </div>
  );
}

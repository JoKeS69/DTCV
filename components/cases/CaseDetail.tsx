import Link from "next/link";
import type { HudCase } from "@/lib/cases/hud-data";
import { CaseStatusText } from "@/components/cases/CaseStatusText";

function priorityClass(p: HudCase["priority"]) {
  if (p === "HIGH" || p === "MEDIUM") return "text-amber";
  return "text-text";
}

function formatDetailUpdated(label: string) {
  const l = label.toLowerCase();
  if (l.includes("hrs")) return l.replace("hrs", "hours");
  if (l.includes("02:14")) return "02:14 ago";
  return l;
}

export function CaseDetail({ item }: { item: HudCase | null }) {
  if (!item) {
    return (
      <aside className="hud-panel flex h-full items-center justify-center p-4 font-mono text-[11px] text-text-dim">
        &gt; Select a case row to preview
      </aside>
    );
  }

  const typeLabel =
    item.type.charAt(0) + item.type.slice(1).toLowerCase().replace("_", " ");

  return (
    <aside className="hud-panel flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
          &gt; CASE {item.caseCode}
        </p>
        <CaseStatusText status={item.status} />
      </header>

      <div className="border-b border-border px-3 py-2.5">
        <h2 className="font-mono text-[13px] font-semibold leading-snug tracking-[0.04em] text-text md:text-sm">
          {item.title}
        </h2>
      </div>

      <dl className="space-y-1.5 border-b border-border px-3 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Location</dt>
          <dd className="text-right text-text">{item.location}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Type</dt>
          <dd className="text-text">{typeLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Last Updated</dt>
          <dd className="text-text normal-case tracking-normal">
            {formatDetailUpdated(item.updatedLabel)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Assigned To</dt>
          <dd className="text-text">{item.assignedTo}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Priority</dt>
          <dd className={priorityClass(item.priority)}>
            {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()}
          </dd>
        </div>
      </dl>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
          Overview
        </p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed tracking-normal text-text-muted normal-case">
          {item.overview}
        </p>
      </div>

      <div className="border-t border-border p-3">
        <Link
          href={`/cases/${item.slug}`}
          className="inline-flex w-full items-center justify-center border border-border-strong px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text transition-colors hover:bg-surface-elevated"
        >
          View Full Case →
        </Link>
      </div>
    </aside>
  );
}

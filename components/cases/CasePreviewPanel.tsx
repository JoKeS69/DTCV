import Link from "next/link";
import type { CaseStatus, CaseType, ContentLabel, CasePriority } from "@/lib/generated/prisma/client";
import { ContentLabelBadge } from "@/components/cases/ContentLabelBadge";
import { CaseStatusText } from "@/components/cases/CaseStatusText";
import { formatDateOnly } from "@/lib/format-date";

export type PreviewCase = {
  caseCode: string;
  title: string;
  slug: string;
  location: string | null;
  type: CaseType;
  status: CaseStatus;
  contentLabel: ContentLabel;
  priority: CasePriority;
  isDevStub: boolean;
  updatedAt: Date;
  lastVerifiedAt: Date | null;
  summary?: string;
};

export function CasePreviewPanel({
  item,
  summary,
}: {
  item: PreviewCase | null;
  summary?: string;
}) {
  if (!item) {
    return (
      <aside className="border border-border bg-surface/60 p-4 font-mono text-[11px] text-text-dim">
        &gt; Select a case row to preview
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col border border-border bg-surface/80">
      <header className="flex items-start justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-text-dim">
            &gt; CASE {item.caseCode}
          </p>
          <h2 className="mt-1 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-text">
            {item.title}
          </h2>
        </div>
        <CaseStatusText status={item.status} />
      </header>

      <dl className="space-y-2 border-b border-border px-3 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Location</dt>
          <dd className="text-right text-text">{item.location ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Type</dt>
          <dd className="text-text">{item.type}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Priority</dt>
          <dd className={item.priority === "HIGH" || item.priority === "MEDIUM" ? "text-amber" : "text-text"}>
            {item.priority}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Label</dt>
          <dd>
            <ContentLabelBadge label={item.contentLabel} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Last verified</dt>
          <dd className="text-text">{formatDateOnly(item.lastVerifiedAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-dim">Last updated</dt>
          <dd className="text-text">{formatDateOnly(item.updatedAt)}</dd>
        </div>
      </dl>

      <div className="flex-1 px-3 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
          Overview
        </p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed tracking-normal text-text-muted normal-case">
          {summary ?? "Open the full case file for overview, timeline, people, and sources."}
        </p>
        {item.isDevStub ? (
          <p className="mt-3 border border-amber/40 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-amber">
            Development stub — not a real crime record
          </p>
        ) : null}
      </div>

      <div className="border-t border-border p-3">
        <Link
          href={`/cases/${item.slug}`}
          className="inline-flex w-full items-center justify-center border border-border-strong px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text hover:bg-surface-elevated"
        >
          View full case →
        </Link>
      </div>
    </aside>
  );
}

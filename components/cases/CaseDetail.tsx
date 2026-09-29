import Link from "next/link";
import type { HudCase } from "@/lib/cases/hud-data";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";

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

export function CaseDetail({
  item,
  sheet = false,
}: {
  item: HudCase | null;
  sheet?: boolean;
}) {
  if (!item) {
    return (
      <Panel as="aside" className="items-center justify-center">
        <PanelBody className="font-mono text-[14px] text-text-dim">
          &gt; Select a case row to preview
        </PanelBody>
      </Panel>
    );
  }

  const typeLabel =
    item.type.charAt(0) + item.type.slice(1).toLowerCase().replace("_", " ");

  return (
    <Panel
      as="aside"
      className={sheet ? "motion-sheet-in h-full min-h-[70svh]" : "h-full"}
    >
      <PanelHeader
        action={<StatusBadge status={item.status} />}
      >{`> CASE ${item.caseCode}`}</PanelHeader>

      <div className="border-b border-border px-4 py-4 md:px-5 xl:px-6">
        <h2 className="font-mono text-[18px] font-semibold leading-snug tracking-[0.02em] text-text xl:text-[20px]">
          {item.title}
        </h2>
      </div>

      <dl className="space-y-3 border-b border-border px-4 py-5 font-mono text-[13px] uppercase tracking-[0.08em] md:px-5 xl:px-6">
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-text-dim">Location</dt>
          <dd className="text-right text-text">{item.location}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-text-dim">Type</dt>
          <dd className="text-text">{typeLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-text-dim">Last Updated</dt>
          <dd className="text-right text-text normal-case tracking-normal">
            {formatDetailUpdated(item.updatedLabel)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-text-dim">Assigned To</dt>
          <dd className="text-text">{item.assignedTo}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-text-dim">Priority</dt>
          <dd className={priorityClass(item.priority)}>
            {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()}
          </dd>
        </div>
      </dl>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-5 xl:px-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-text-dim">
          Overview
        </p>
        <p className="mt-3 font-mono text-[14px] leading-relaxed tracking-normal text-text-muted normal-case">
          {item.overview}
        </p>
      </div>

      <div className="border-t border-border p-4 md:p-5 xl:p-6">
        <Link
          href={`/cases/${item.slug}`}
          className="inline-flex w-full items-center justify-center rounded-[6px] border border-border-strong bg-surface-elevated px-4 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-text transition-colors hover:border-online/40 hover:bg-selected"
        >
          View Full Case →
        </Link>
      </div>
    </Panel>
  );
}

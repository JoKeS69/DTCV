import type { HudCase } from "@/lib/cases/hud-types";
import { CaseCard } from "@/components/ui/CaseCard";
import { CaseRow } from "@/components/cases/CaseRow";

export function CaseTable({
  items,
  selectedCode,
  buildSelectHref,
}: {
  items: HudCase[];
  selectedCode: string | null;
  buildSelectHref: (caseCode: string) => string;
}) {
  return (
    <>
      {/* Desktop / tablet table — never on mobile */}
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="sticky top-0 z-[1] border-b border-border bg-surface">
            <tr className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-dim">
              <th className="px-5 py-4 font-medium xl:px-6">Case ID</th>
              <th className="px-5 py-4 font-medium xl:px-6">Title</th>
              <th className="px-5 py-4 font-medium xl:px-6">Location</th>
              <th className="px-5 py-4 font-medium xl:px-6">Type</th>
              <th className="px-5 py-4 font-medium xl:px-6">Status</th>
              <th className="px-5 py-4 font-medium xl:px-6">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <CaseRow
                key={item.id}
                item={item}
                href={buildSelectHref(item.caseCode)}
                active={item.caseCode === selectedCode}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile case cards */}
      <ul className="flex flex-col gap-3 p-4 md:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <CaseCard
              item={item}
              href={buildSelectHref(item.caseCode)}
              active={item.caseCode === selectedCode}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

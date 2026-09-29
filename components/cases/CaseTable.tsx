import type { HudCase } from "@/lib/cases/hud-data";
import { CaseRow } from "@/components/cases/CaseRow";

export function CaseTable({
  items,
  selectedCode,
  buildSelectHref,
}: {
  items: HudCase[];
  selectedCode: string;
  buildSelectHref: (caseCode: string) => string;
}) {
  return (
    <>
      {/* Desktop dense table */}
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead className="sticky top-0 z-[1] border-b border-border bg-bg">
            <tr className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
              <th className="px-2 py-1.5 font-medium">Case ID</th>
              <th className="px-2 py-1.5 font-medium">Title</th>
              <th className="px-2 py-1.5 font-medium">Location</th>
              <th className="px-2 py-1.5 font-medium">Type</th>
              <th className="px-2 py-1.5 font-medium">Status</th>
              <th className="px-2 py-1.5 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <CaseRow
                key={item.id}
                item={item}
                href={buildSelectHref(item.caseCode)}
                active={item.caseCode === selectedCode}
                variant="desktop"
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile compact columns — ~5 rows visible like mockup before Global Overview */}
      <div className="max-h-[200px] overflow-y-auto md:hidden">
        <div className="sticky top-0 z-[1] grid grid-cols-[70px_52px_minmax(0,1fr)_64px_72px_12px] gap-1 border-b border-border bg-bg px-2 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">
          <span>ID</span>
          <span>Location</span>
          <span>Type</span>
          <span>Status</span>
          <span className="text-right">Updated</span>
          <span />
        </div>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <CaseRow
                item={item}
                href={buildSelectHref(item.caseCode)}
                active={item.caseCode === selectedCode}
                variant="mobile"
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

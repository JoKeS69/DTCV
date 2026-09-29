import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { CaseDetail } from "@/components/cases/CaseDetail";
import { CaseTable } from "@/components/cases/CaseTable";
import { CasesToolbar } from "@/components/cases/CasesToolbar";
import { DiscussionPanel } from "@/components/cases/DiscussionPanel";
import { GlobalCases } from "@/components/cases/GlobalCases";
import { RecentActivity } from "@/components/cases/RecentActivity";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import {
  filterHudCases,
  HUD_ACTIVITY,
  HUD_DISCUSSIONS,
  HUD_STATS,
} from "@/lib/cases/hud-data";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Case database",
  description:
    "CASE//NET command deck — browse case files with dense investigation HUD. No guilt declarations.",
  path: "/cases",
});

export const revalidate = 60;

type SearchParams = Promise<{
  q?: string;
  type?: string;
  status?: string;
  sort?: string;
  select?: string;
  focus?: string;
}>;

export default async function CasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { items, selected } = filterHudCases({
    q: sp.q,
    type: sp.type,
    status: sp.status,
    sort: sp.sort,
    select: sp.select,
  });

  const discussions = HUD_DISCUSSIONS[selected.caseCode] ?? [];
  const showMobileDetail =
    Boolean(sp.select) && sp.focus !== "discussions";
  const showMobileDiscussion = sp.focus === "discussions";
  /** Tablet drawer when select present (md–xl) */
  const showTabletDrawer = Boolean(sp.select);

  const buildSelectHref = (caseCode: string) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.type && sp.type !== "ALL") params.set("type", sp.type);
    if (sp.status && sp.status !== "ALL") params.set("status", sp.status);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.focus) params.set("focus", sp.focus);
    params.set("select", caseCode);
    return `/cases?${params.toString()}`;
  };

  const closeSheetHref = (() => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.type && sp.type !== "ALL") params.set("type", sp.type);
    if (sp.status && sp.status !== "ALL") params.set("status", sp.status);
    if (sp.sort) params.set("sort", sp.sort);
    const q = params.toString();
    return q ? `/cases?${q}` : "/cases";
  })();

  return (
    <main className="flex h-full min-h-0 flex-col gap-4 p-4 md:gap-5 md:p-5 xl:gap-6 xl:p-6">
      {/* Desktop ≥1280: DB+detail | map+activity+discussion */}
      <div className="grid min-h-0 flex-1 gap-4 md:gap-5 xl:grid-rows-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-6">
        <div className="grid min-h-0 gap-4 md:gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)] xl:gap-6">
          <Panel id="case-database" className="min-h-[420px] xl:min-h-0">
            <PanelHeader className="text-[13px] text-text-muted md:text-[13px]">
              <span className="md:hidden">&gt; CASES</span>
              <span className="hidden md:inline">&gt; CASE DATABASE</span>
            </PanelHeader>

            <CasesToolbar
              q={sp.q ?? ""}
              type={sp.type ?? "ALL"}
              status={sp.status ?? "ALL"}
              sort={sp.sort ?? "updated"}
              select={sp.select}
              focus={sp.focus}
            />

            {items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-6 py-16 font-mono text-[14px] text-text-muted">
                No case files match these filters.
              </div>
            ) : (
              <CaseTable
                items={items}
                selectedCode={selected.caseCode}
                buildSelectHref={buildSelectHref}
              />
            )}
          </Panel>

          {/* Desktop detail column */}
          <div className="hidden min-h-0 xl:block">
            <CaseDetail item={selected} />
          </div>
        </div>

        <div className="grid min-h-0 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-6">
          <GlobalCases stats={HUD_STATS} />
          <RecentActivity items={HUD_ACTIVITY} />
          <div className="hidden min-h-0 xl:block">
            <DiscussionPanel
              caseCode={selected.caseCode}
              discussions={discussions}
            />
          </div>
          <div className="hidden md:col-span-2 md:block xl:hidden">
            <DiscussionPanel
              caseCode={selected.caseCode}
              discussions={discussions}
            />
          </div>
        </div>
      </div>

      {/* Tablet detail drawer (768–1279) */}
      {showTabletDrawer ? (
        <div className="fixed inset-y-0 right-0 z-40 hidden w-[min(420px,46vw)] border-l border-border bg-bg shadow-2xl md:block xl:hidden">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted">
              Case detail
            </p>
            <Link
              href={closeSheetHref}
              className="inline-flex size-9 items-center justify-center rounded-[6px] text-text-muted hover:bg-surface hover:text-text"
              aria-label="Close detail"
            >
              <X className="size-4" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-4">
            <CaseDetail item={selected} />
          </div>
        </div>
      ) : null}

      {/* Mobile full-screen sheets */}
      {showMobileDetail ? (
        <div className="fixed inset-0 z-50 bg-bg/95 p-4 pt-4 backdrop-blur-sm md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted">
              Case detail
            </p>
            <Link
              href={closeSheetHref}
              className="inline-flex size-10 items-center justify-center rounded-[6px] border border-border text-text-muted"
              aria-label="Close detail"
            >
              <X className="size-4" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto pb-20">
            <CaseDetail item={selected} sheet />
          </div>
        </div>
      ) : null}

      {showMobileDiscussion ? (
        <div className="fixed inset-0 z-50 bg-bg/95 p-4 backdrop-blur-sm md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted">
              Discussion
            </p>
            <Link
              href={closeSheetHref}
              className="inline-flex size-10 items-center justify-center rounded-[6px] border border-border text-text-muted"
              aria-label="Close discussion"
            >
              <X className="size-4" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto pb-20">
            <DiscussionPanel
              caseCode={selected.caseCode}
              discussions={discussions}
              sheet
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { CaseDetail } from "@/components/cases/CaseDetail";
import { CaseTable } from "@/components/cases/CaseTable";
import { CasesToolbar } from "@/components/cases/CasesToolbar";
import { GlobalCases } from "@/components/cases/GlobalCases";
import { RecentActivity } from "@/components/cases/RecentActivity";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import {
  toHudActivity,
  toHudCase,
  toHudStats,
} from "@/lib/cases/hud-adapters";
import type { HudCase } from "@/lib/cases/hud-types";
import {
  getCaseStatsCached,
  getMapMarkersCached,
  getRecentActivityCached,
} from "@/lib/cases/dashboard";
import { listPublishedCasesCached } from "@/lib/cases/public-cache";
import type { CaseStatus, CaseType } from "@/lib/generated/prisma/client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Case database",
  description:
    "CASE//NET command deck — browse published case files. No guilt declarations.",
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
  const sort =
    sp.sort === "year" || sp.sort === "code" || sp.sort === "updated"
      ? sp.sort
      : "updated";

  let list: Awaited<ReturnType<typeof listPublishedCasesCached>>;
  let statsBundle: Awaited<ReturnType<typeof getCaseStatsCached>>;
  let activityRaw: Awaited<ReturnType<typeof getRecentActivityCached>>;
  let mapMarkers: Awaited<ReturnType<typeof getMapMarkersCached>>;
  try {
    [list, statsBundle, activityRaw, mapMarkers] = await Promise.all([
      listPublishedCasesCached({
        q: sp.q,
        type: (sp.type as CaseType | "ALL" | undefined) ?? "ALL",
        status: (sp.status as CaseStatus | "ALL" | undefined) ?? "ALL",
        sort,
        page: 1,
      }),
      getCaseStatsCached(),
      getRecentActivityCached(),
      getMapMarkersCached(),
    ]);
  } catch {
    list = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
    statsBundle = {
      counts: { total: 0, OPEN: 0, COLD: 0, UNSOLVED: 0, CLOSED: 0 },
      topLocations: [],
    };
    activityRaw = [];
    mapMarkers = [];
  }

  const items: HudCase[] = list.items.map(toHudCase);
  const selected =
    items.find(
      (c) => c.caseCode === sp.select || c.slug === sp.select,
    ) ?? null;

  const stats = toHudStats(statsBundle.counts, statsBundle.topLocations);
  const activity = toHudActivity(activityRaw);

  const showMobileDetail = Boolean(sp.select) && Boolean(selected);
  const showTabletDrawer = Boolean(sp.select) && Boolean(selected);

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

  const emptyDatabase =
    items.length === 0 &&
    !sp.q &&
    (!sp.type || sp.type === "ALL") &&
    (!sp.status || sp.status === "ALL");

  return (
    <main className="deck-page deck-page--wide deck-page--flush">
      <div className="grid min-h-0 flex-1 gap-6 md:gap-7 xl:grid-rows-[minmax(0,1fr)_auto] xl:gap-6">
        <div className="grid min-h-0 gap-6 md:gap-7 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)] xl:gap-6">
          <Panel id="case-database" className="min-h-[360px] xl:min-h-0">
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
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center font-mono">
                <p className="text-[14px] text-text-muted">
                  {emptyDatabase
                    ? "No cases available yet."
                    : "No case files match these filters."}
                </p>
                <p className="max-w-md text-[12px] text-text-dim">
                  {emptyDatabase
                    ? "Connect a data source to publish case files."
                    : "Try broader search or filters."}
                </p>
              </div>
            ) : (
              <CaseTable
                items={items}
                selectedCode={selected?.caseCode ?? null}
                buildSelectHref={buildSelectHref}
              />
            )}
          </Panel>

          <div className="hidden min-h-0 xl:block">
            <CaseDetail item={selected} />
          </div>
        </div>

        <div className="grid min-h-0 shrink-0 gap-6 md:grid-cols-2 md:gap-6 xl:gap-6">
          <GlobalCases stats={stats} markers={mapMarkers} />
          <RecentActivity items={activity} />
        </div>
      </div>

      {showTabletDrawer && selected ? (
        <div className="fixed inset-y-3 right-3 z-40 hidden w-[min(420px,46vw)] border border-border bg-bg shadow-2xl md:block xl:hidden">
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

      {showMobileDetail && selected ? (
        <div className="fixed inset-3 z-50 border border-border bg-bg/95 p-4 backdrop-blur-sm md:hidden">
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
    </main>
  );
}

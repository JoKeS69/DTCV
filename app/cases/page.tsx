import type { Metadata } from "next";
import { CaseDetail } from "@/components/cases/CaseDetail";
import { CaseTable } from "@/components/cases/CaseTable";
import { CasesToolbar } from "@/components/cases/CasesToolbar";
import { DiscussionPanel } from "@/components/cases/DiscussionPanel";
import { GlobalCases } from "@/components/cases/GlobalCases";
import { RecentActivity } from "@/components/cases/RecentActivity";
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

  return (
    <main className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-rows-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid min-h-0 gap-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(250px,0.85fr)]">
          <section
            id="case-database"
            className="hud-panel flex min-h-[300px] flex-col lg:min-h-0"
          >
            <header className="hud-panel-title">
              <span className="md:hidden">&gt; CASES</span>
              <span className="hidden md:inline">&gt; CASE DATABASE</span>
            </header>

            <CasesToolbar
              q={sp.q ?? ""}
              type={sp.type ?? "ALL"}
              status={sp.status ?? "ALL"}
              sort={sp.sort ?? "updated"}
              select={sp.select}
              focus={sp.focus}
            />

            {items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 py-10 font-mono text-xs text-text-muted">
                No case files match these filters.
              </div>
            ) : (
              <CaseTable
                items={items}
                selectedCode={selected.caseCode}
                buildSelectHref={buildSelectHref}
              />
            )}
          </section>

          <div className="hidden min-h-0 lg:block">
            <CaseDetail item={selected} />
          </div>
        </div>

        <div className="grid min-h-0 gap-2 lg:grid-cols-3">
          <GlobalCases stats={HUD_STATS} />
          <RecentActivity items={HUD_ACTIVITY} />
          <div className="hidden min-h-0 lg:block">
            <DiscussionPanel
              caseCode={selected.caseCode}
              discussions={discussions}
            />
          </div>
        </div>

        {sp.select && sp.focus !== "discussions" ? (
          <div className="lg:hidden">
            <CaseDetail item={selected} />
          </div>
        ) : null}
        {sp.focus === "discussions" ? (
          <div className="lg:hidden">
            <DiscussionPanel
              caseCode={selected.caseCode}
              discussions={discussions}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

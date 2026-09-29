import type { Metadata } from "next";
import Link from "next/link";
import type { CaseStatus, CaseType } from "@/lib/generated/prisma/client";
import { CaseFilters } from "@/components/cases/CaseFilters";
import { CasePreviewPanel } from "@/components/cases/CasePreviewPanel";
import { CaseStatusText } from "@/components/cases/CaseStatusText";
import { DiscussionHudPanel } from "@/components/cases/DiscussionHudPanel";
import { GlobalCasesPanel } from "@/components/cases/GlobalCasesPanel";
import { RecentActivityPanel } from "@/components/cases/RecentActivityPanel";
import {
  getCaseStatsCached,
  getRecentActivityCached,
} from "@/lib/cases/dashboard";
import {
  getCaseBySlugCached,
  listPublishedCasesCached,
} from "@/lib/cases/public-cache";
import { formatDateOnly } from "@/lib/format-date";
import { getPrisma } from "@/lib/db";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Case database",
  description:
    "DETECTIVE command deck — browse published case files with safety labels. No guilt declarations.",
  path: "/cases",
});

export const revalidate = 60;

type SearchParams = Promise<{
  q?: string;
  type?: string;
  status?: string;
  country?: string;
  year?: string;
  sort?: string;
  page?: string;
  select?: string;
  focus?: string;
}>;

function buildQuery(sp: Awaited<SearchParams>, page: number) {
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.type && sp.type !== "ALL") params.set("type", sp.type);
  if (sp.status && sp.status !== "ALL") params.set("status", sp.status);
  if (sp.country) params.set("country", sp.country);
  if (sp.year) params.set("year", sp.year);
  if (sp.sort) params.set("sort", sp.sort);
  if (page > 1) params.set("page", String(page));
  return params;
}

function relativeUpdated(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} MIN AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} HRS AGO`;
  const days = Math.floor(hrs / 24);
  return `${days} DAYS AGO`;
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const [result, stats, activity] = await Promise.all([
    listPublishedCasesCached({
      q: sp.q,
      type: (sp.type as CaseType | "ALL" | undefined) ?? "ALL",
      status: (sp.status as CaseStatus | "ALL" | undefined) ?? "ALL",
      country: sp.country,
      year: sp.year,
      sort: (sp.sort as "updated" | "year" | "code" | undefined) ?? "updated",
      page,
    }),
    getCaseStatsCached(),
    getRecentActivityCached(),
  ]);

  const selectedSlug = sp.select ?? result.items[0]?.slug;
  const selected =
    selectedSlug != null
      ? result.items.find((item) => item.slug === selectedSlug) ?? null
      : null;
  const selectedFull = selectedSlug
    ? await getCaseBySlugCached(selectedSlug)
    : null;

  let discussions: {
    id: string;
    title: string;
    createdAt: Date;
    authorUsername: string;
    commentCount: number;
  }[] = [];
  if (selected?.id) {
    try {
      const rows = await getPrisma().discussion.findMany({
        where: {
          caseId: selected.id,
          deletedAt: null,
          status: { not: "HIDDEN" },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          createdAt: true,
          author: { select: { username: true } },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
      });
      discussions = rows.map((d) => ({
        id: d.id,
        title: d.title,
        createdAt: d.createdAt,
        authorUsername: d.author.username,
        commentCount: d._count.comments,
      }));
    } catch {
      discussions = [];
    }
  }

  const prevQuery = buildQuery(sp, page - 1);
  const nextQuery = buildQuery(sp, page + 1);
  if (sp.select) {
    prevQuery.set("select", sp.select);
    nextQuery.set("select", sp.select);
  }

  return (
    <main className="flex h-full min-h-0 flex-col gap-2 p-2 md:p-2.5">
      {/* Desktop: mockup 5-panel grid · Mobile: stacked sections */}
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-rows-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="grid min-h-0 gap-2 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.9fr)]">
          {/* CASE DATABASE */}
          <section
            id="case-database"
            className="flex min-h-[320px] flex-col border border-border bg-bg lg:min-h-0"
          >
            <header className="border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
              &gt; Case database
            </header>
            <CaseFilters
              compact
              q={sp.q ?? ""}
              type={sp.type ?? "ALL"}
              status={sp.status ?? "ALL"}
              country={sp.country ?? ""}
              year={sp.year ?? ""}
              sort={sp.sort ?? "updated"}
            />

            {result.items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 py-10 font-mono text-xs text-text-muted">
                No published case files match these filters.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden min-h-0 flex-1 overflow-auto md:block">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead className="sticky top-0 border-b border-border bg-bg">
                      <tr className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                        <th className="px-2 py-1.5">Case ID</th>
                        <th className="px-2 py-1.5">Title</th>
                        <th className="px-2 py-1.5">Location</th>
                        <th className="px-2 py-1.5">Type</th>
                        <th className="px-2 py-1.5">Status</th>
                        <th className="px-2 py-1.5">Last updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item) => {
                        const params = buildQuery(sp, page);
                        params.set("select", item.slug);
                        const href = `/cases?${params.toString()}`;
                        const active = item.slug === selectedSlug;
                        return (
                          <tr
                            key={item.id}
                            className={[
                              "border-b border-border/70 font-mono text-[11px]",
                              active
                                ? "bg-surface-elevated"
                                : "hover:bg-surface/80",
                            ].join(" ")}
                          >
                            <td className="px-2 py-1.5">
                              <Link href={href} className="text-text">
                                {item.caseCode}
                              </Link>
                            </td>
                            <td className="px-2 py-1.5">
                              <Link href={href} className="text-text">
                                {item.title}
                              </Link>
                            </td>
                            <td className="px-2 py-1.5 text-text-muted">
                              {item.location ?? item.countryCode ?? "—"}
                            </td>
                            <td className="px-2 py-1.5 text-text-muted">
                              {item.type}
                            </td>
                            <td className="px-2 py-1.5">
                              <CaseStatusText status={item.status} />
                            </td>
                            <td className="px-2 py-1.5 text-text-dim">
                              {formatDateOnly(item.updatedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile compact rows — mockup columns */}
                <ul className="divide-y divide-border/80 md:hidden">
                  {result.items.map((item) => {
                    const params = buildQuery(sp, page);
                    params.set("select", item.slug);
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/cases?${params.toString()}`}
                          className="flex items-center gap-2 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.08em]"
                        >
                          <span className="w-[72px] shrink-0 text-text">
                            {item.caseCode}
                          </span>
                          <span className="w-14 shrink-0 text-text-muted">
                            {item.countryCode ?? "—"}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-text-muted">
                            {item.type}
                          </span>
                          <span className="shrink-0">
                            <CaseStatusText status={item.status} />
                          </span>
                          <span className="w-[72px] shrink-0 text-right text-text-dim">
                            {relativeUpdated(item.updatedAt)}
                          </span>
                          <span className="text-text-dim">&gt;</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <div className="mt-auto flex items-center justify-between border-t border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
              {page > 1 ? (
                <Link
                  href={`/cases?${prevQuery.toString()}`}
                  className="text-text-muted hover:text-text"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="text-text-dim">← Prev</span>
              )}
              <span className="text-text-dim">
                {result.total} files · {result.page}/{result.totalPages}
              </span>
              {page < result.totalPages ? (
                <Link
                  href={`/cases?${nextQuery.toString()}`}
                  className="text-text-muted hover:text-text"
                >
                  Next →
                </Link>
              ) : (
                <span className="text-text-dim">Next →</span>
              )}
            </div>
          </section>

          {/* CASE DETAIL */}
          <div className="min-h-[280px] lg:min-h-0">
            <CasePreviewPanel
              item={selected}
              summary={selectedFull?.summary}
            />
          </div>
        </div>

        <div className="grid min-h-0 gap-2 lg:grid-cols-3">
          <section className="lg:min-h-0">
            <p className="mb-0 border border-b-0 border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim md:hidden">
              &gt; Global overview
            </p>
            <GlobalCasesPanel
              counts={stats.counts}
              topLocations={stats.topLocations}
            />
          </section>
          <RecentActivityPanel items={activity} />
          <DiscussionHudPanel
            caseCode={selected?.caseCode ?? null}
            caseSlug={selected?.slug ?? null}
            discussions={discussions}
          />
        </div>
      </div>
    </main>
  );
}

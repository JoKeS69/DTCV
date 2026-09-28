import type { Metadata } from "next";
import Link from "next/link";
import type { CaseStatus, CaseType } from "@/lib/generated/prisma/client";
import { CaseFilters } from "@/components/cases/CaseFilters";
import { CasePreviewPanel } from "@/components/cases/CasePreviewPanel";
import { CaseStatusText } from "@/components/cases/CaseStatusText";
import { ContentLabelBadge } from "@/components/cases/ContentLabelBadge";
import { getCaseBySlug, listPublishedCases } from "@/lib/cases/queries";

export const metadata: Metadata = {
  title: "Case database",
};

type SearchParams = Promise<{
  q?: string;
  type?: string;
  status?: string;
  country?: string;
  year?: string;
  sort?: string;
  page?: string;
  select?: string;
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

export default async function CasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const result = await listPublishedCases({
    q: sp.q,
    type: (sp.type as CaseType | "ALL" | undefined) ?? "ALL",
    status: (sp.status as CaseStatus | "ALL" | undefined) ?? "ALL",
    country: sp.country,
    year: sp.year,
    sort: (sp.sort as "updated" | "year" | "code" | undefined) ?? "updated",
    page,
  });

  const selectedSlug = sp.select ?? result.items[0]?.slug;
  const selected =
    selectedSlug != null
      ? result.items.find((item) => item.slug === selectedSlug) ?? null
      : null;
  const selectedFull = selectedSlug ? await getCaseBySlug(selectedSlug) : null;

  const prevQuery = buildQuery(sp, page - 1);
  const nextQuery = buildQuery(sp, page + 1);
  if (sp.select) {
    prevQuery.set("select", sp.select);
    nextQuery.set("select", sp.select);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-3 py-4 md:px-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border border-border bg-surface/50 px-3 py-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
            &gt; Case database
          </p>
          <h1 className="mt-1 font-mono text-lg font-semibold uppercase tracking-[0.12em] text-text">
            Global case files
          </h1>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
          {result.total} published · page {result.page}/{result.totalPages}
        </p>
      </div>

      <p className="border border-border px-3 py-2 font-mono text-[10px] leading-relaxed text-text-muted">
        Safety: files use{" "}
        <span className="text-online">Verified</span> /{" "}
        <span className="text-amber">Reported</span> /{" "}
        <span className="text-text-dim">User theory</span> labels. No guilt
        declarations. Development stubs are marked explicitly and are not real
        crimes.
      </p>

      <CaseFilters
        q={sp.q ?? ""}
        type={sp.type ?? "ALL"}
        status={sp.status ?? "ALL"}
        country={sp.country ?? ""}
        year={sp.year ?? ""}
        sort={sp.sort ?? "updated"}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        <section className="border border-border bg-surface/40">
          {result.items.length === 0 ? (
            <div className="px-4 py-16 text-center font-mono text-xs text-text-muted">
              No published case files match these filters.
              <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-text-dim">
                Empty database or filters too narrow
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead className="border-b border-border bg-bg/80">
                  <tr className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
                    <th className="px-2 py-2">Case ID</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Location</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Label</th>
                    <th className="px-2 py-2">Updated</th>
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
                          "border-b border-border/80 font-mono text-[11px]",
                          active ? "bg-surface-elevated" : "hover:bg-surface",
                        ].join(" ")}
                      >
                        <td className="px-2 py-2">
                          <Link href={href} className="text-text">
                            {item.caseCode}
                          </Link>
                        </td>
                        <td className="px-2 py-2">
                          <Link href={href} className="text-text">
                            {item.title}
                            {item.isDevStub ? (
                              <span className="ml-2 text-[9px] uppercase tracking-[0.12em] text-amber">
                                Dev
                              </span>
                            ) : null}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-text-muted">
                          {item.location ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-text-muted">{item.type}</td>
                        <td className="px-2 py-2">
                          <CaseStatusText status={item.status} />
                        </td>
                        <td className="px-2 py-2">
                          <ContentLabelBadge label={item.contentLabel} />
                        </td>
                        <td className="px-2 py-2 text-text-dim">
                          {item.updatedAt.toISOString().slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            {page > 1 ? (
              <Link href={`/cases?${prevQuery.toString()}`} className="text-text-muted hover:text-text">
                ← Prev
              </Link>
            ) : (
              <span className="text-text-dim">← Prev</span>
            )}
            <span className="text-text-dim">
              Page {result.page} / {result.totalPages}
            </span>
            {page < result.totalPages ? (
              <Link href={`/cases?${nextQuery.toString()}`} className="text-text-muted hover:text-text">
                Next →
              </Link>
            ) : (
              <span className="text-text-dim">Next →</span>
            )}
          </div>
        </section>

        <CasePreviewPanel
          item={selected}
          summary={selectedFull?.summary}
        />
      </div>
    </main>
  );
}

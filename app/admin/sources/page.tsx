import type { Metadata } from "next";
import Link from "next/link";
import { deleteCaseSource } from "@/app/actions/admin";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { SourcesAddPanel } from "@/components/admin/SourcesAddPanel";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Sources" };

export default async function AdminSourcesPage() {
  const prisma = getPrisma();
  const [sources, cases] = await Promise.all([
    prisma.caseSource.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        case: { select: { id: true, caseCode: true, title: true, slug: true } },
      },
    }),
    prisma.case.findMany({
      orderBy: { caseCode: "asc" },
      select: { id: true, caseCode: true, title: true },
      take: 100,
    }),
  ]);

  return (
    <AdminShell
      title="Sources"
      subtitle="Citations for real cases. Prefer primary reporting outlets — never invent claims."
      current="/admin/sources"
    >
      <section className="border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Add source
        </header>
        <div className="px-4 py-3">
          {cases.length === 0 ? (
            <p className="font-mono text-[11px] text-text-dim">
              No cases yet.{" "}
              <Link href="/admin/cases/new" className="text-text hover:text-cta">
                Create a case
              </Link>{" "}
              first.
            </p>
          ) : (
            <SourcesAddPanel cases={cases} />
          )}
        </div>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; All sources ({sources.length})
        </header>
        <ul className="divide-y divide-border">
          {sources.length === 0 ? (
            <li className="px-4 py-3 font-mono text-[11px] text-text-dim">
              No sources yet.
            </li>
          ) : (
            sources.map((source) => (
              <li
                key={source.id}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-[11px] text-text">{source.title}</p>
                  <p className="mt-1 font-mono text-[10px] text-text-dim break-all">
                    {source.url}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-text-muted">
                    <Link
                      href={`/admin/cases/${source.case.id}`}
                      className="hover:text-cta"
                    >
                      {source.case.caseCode}
                    </Link>
                    {source.publisher ? ` · ${source.publisher}` : ""}
                  </p>
                </div>
                <AdminActionButton
                  label="Remove"
                  danger
                  onAction={deleteCaseSource.bind(null, source.id)}
                />
              </li>
            ))
          )}
        </ul>
      </section>
    </AdminShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  setCaseFeatured,
  setCasePublished,
} from "@/app/actions/admin";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Real cases" };

export default async function AdminCasesPage() {
  const cases = await getPrisma().case.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      caseCode: true,
      title: true,
      slug: true,
      status: true,
      published: true,
      featured: true,
      isDevStub: true,
      contentLabel: true,
      _count: { select: { sources: true } },
    },
  });

  return (
    <AdminShell
      title="Real cases"
      subtitle="Create, publish, feature, and curate sourced case files. Prefer REPORTED/VERIFIED labels — never guilt claims."
      current="/admin/cases"
    >
      <div className="mb-3">
        <Link
          href="/admin/cases/new"
          className="inline-flex border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20"
        >
          + New case
        </Link>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[800px] border-collapse text-left font-mono text-[11px]">
          <thead className="border-b border-border bg-surface/70 text-[9px] uppercase tracking-[0.14em] text-text-dim">
            <tr>
              <th className="px-3 py-2">Case</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2">Sources</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cases.map((c) => (
              <tr key={c.id} className="bg-surface/30">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/cases/${c.id}`}
                    className="text-text hover:text-cta"
                  >
                    {c.caseCode} · {c.title}
                  </Link>
                  <p className="text-[10px] text-text-dim">{c.contentLabel}</p>
                </td>
                <td className="px-3 py-2 text-text-muted">{c.status}</td>
                <td className="px-3 py-2 text-[10px] text-text-dim">
                  {c.published ? "PUBLISHED" : "DRAFT"}
                  {c.featured ? " · FEATURED" : ""}
                  {c.isDevStub ? " · DEV" : ""}
                </td>
                <td className="px-3 py-2 text-text-muted">{c._count.sources}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <AdminActionButton
                      label={c.published ? "Unpublish" : "Publish"}
                      onAction={() => setCasePublished(c.id, !c.published)}
                    />
                    <AdminActionButton
                      label={c.featured ? "Unfeature" : "Feature"}
                      onAction={() => setCaseFeatured(c.id, !c.featured)}
                    />
                    <Link
                      href={`/admin/cases/${c.id}`}
                      className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

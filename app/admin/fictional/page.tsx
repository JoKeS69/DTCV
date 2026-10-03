import type { Metadata } from "next";
import Link from "next/link";
import { setFictionalPublished } from "@/app/actions/admin";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Fictional" };

export default async function AdminFictionalPage() {
  const cases = await getPrisma().fictionalCase.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      caseCode: true,
      title: true,
      slug: true,
      difficulty: true,
      published: true,
      estimatedMinutes: true,
      solution: { select: { id: true } },
      _count: {
        select: { suspects: true, evidence: true },
      },
    },
  });

  return (
    <AdminShell
      title="Fictional cases"
      subtitle="Training files only. Keep FICTIONAL language in synopses. Solution stays server-side."
      current="/admin/fictional"
    >
      <div className="mb-3">
        <Link
          href="/admin/fictional/new"
          className="inline-flex border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20"
        >
          + New fictional case
        </Link>
      </div>

      <ul className="space-y-2">
        {cases.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 border border-border bg-surface/40 px-3 py-2"
          >
            <div>
              <Link
                href={`/admin/fictional/${c.id}`}
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-text hover:text-cta"
              >
                {c.title}
              </Link>
              <p className="mt-1 font-mono text-[10px] text-text-dim">
                {c.difficulty} · {c.estimatedMinutes ?? "—"} min ·{" "}
                {c._count.suspects} suspects · {c._count.evidence} evidence ·
                solution {c.solution ? "yes" : "no"} ·{" "}
                {c.published ? "PUBLISHED" : "DRAFT"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <AdminActionButton
                label={c.published ? "Unpublish" : "Publish"}
                onAction={setFictionalPublished.bind(null, c.id, !c.published)}
              />
              <Link
                href={`/admin/fictional/${c.id}`}
                className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text"
              >
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}

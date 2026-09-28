import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteCaseSource,
  setCaseFeatured,
  setCasePublished,
} from "@/app/actions/admin";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { CaseAdminForm } from "@/components/admin/CaseAdminForm";
import { SourceAdminForm } from "@/components/admin/SourceAdminForm";
import { getPrisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Admin · Edit case" };

export default async function AdminCaseEditPage({ params }: Props) {
  const { id } = await params;
  const caseFile = await getPrisma().case.findUnique({
    where: { id },
    include: {
      sources: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!caseFile) notFound();

  return (
    <AdminShell
      title={`Edit ${caseFile.caseCode}`}
      subtitle={caseFile.title}
      current="/admin/cases"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <AdminActionButton
          label={caseFile.published ? "Unpublish" : "Publish"}
          onAction={setCasePublished.bind(
            null,
            caseFile.id,
            !caseFile.published,
          )}
        />
        <AdminActionButton
          label={caseFile.featured ? "Unfeature" : "Feature"}
          onAction={setCaseFeatured.bind(
            null,
            caseFile.id,
            !caseFile.featured,
          )}
        />
        {caseFile.published ? (
          <Link
            href={`/cases/${caseFile.slug}`}
            className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text"
          >
            View public
          </Link>
        ) : null}
      </div>

      <CaseAdminForm
        initial={{
          id: caseFile.id,
          caseCode: caseFile.caseCode,
          title: caseFile.title,
          slug: caseFile.slug,
          summary: caseFile.summary,
          publicNotes: caseFile.publicNotes ?? "",
          location: caseFile.location ?? "",
          countryCode: caseFile.countryCode ?? "",
          year: caseFile.year != null ? String(caseFile.year) : "",
          type: caseFile.type,
          status: caseFile.status,
          priority: caseFile.priority,
          contentLabel: caseFile.contentLabel,
          isDevStub: caseFile.isDevStub,
        }}
      />

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Sources
        </header>
        <div className="space-y-3 px-4 py-3">
          <ul className="space-y-2">
            {caseFile.sources.map((source) => (
              <li
                key={source.id}
                className="border border-border/80 px-3 py-2"
              >
                <p className="font-mono text-[11px] text-text">{source.title}</p>
                <p className="mt-1 font-mono text-[10px] text-text-dim break-all">
                  {source.url}
                </p>
                <div className="mt-2">
                  <AdminActionButton
                    label="Delete source"
                    danger
                    onAction={deleteCaseSource.bind(null, source.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
          <SourceAdminForm caseId={caseFile.id} />
        </div>
      </section>
    </AdminShell>
  );
}

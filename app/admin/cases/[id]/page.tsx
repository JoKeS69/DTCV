import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  setCaseFeatured,
  setCasePublished,
} from "@/app/actions/admin";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { CaseAdminForm } from "@/components/admin/CaseAdminForm";
import { CaseOverrideForm } from "@/components/admin/CaseOverrideForm";
import { getPrisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Admin · Edit case" };

export default async function AdminCaseEditPage({ params }: Props) {
  const { id } = await params;
  const caseFile = await getPrisma().case.findUnique({
    where: { id },
    include: {
      adminOverride: true,
    },
  });
  if (!caseFile) notFound();

  return (
    <AdminShell
      title={`Edit case`}
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

      <div className="mb-4">
        <CaseOverrideForm
          caseId={caseFile.id}
          initialHide={caseFile.adminOverride?.hide ?? false}
          initialNote={caseFile.adminOverride?.note ?? ""}
        />
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
          latitude:
            caseFile.latitude != null ? String(caseFile.latitude) : "",
          longitude:
            caseFile.longitude != null ? String(caseFile.longitude) : "",
          year: caseFile.year != null ? String(caseFile.year) : "",
          type: caseFile.type,
          status: caseFile.status,
          priority: caseFile.priority,
          contentLabel: caseFile.contentLabel,
          isDevStub: caseFile.isDevStub,
        }}
      />
    </AdminShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setFictionalPublished } from "@/app/actions/admin";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { FictionalAdminForm } from "@/components/admin/FictionalAdminForm";
import { getPrisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Admin · Edit fictional" };

export default async function AdminFictionalEditPage({ params }: Props) {
  const { id } = await params;
  const caseFile = await getPrisma().fictionalCase.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          suspects: true,
          evidence: true,
          events: true,
          witnessStatements: true,
        },
      },
      solution: { select: { id: true } },
    },
  });
  if (!caseFile) notFound();

  return (
    <AdminShell
      title={`Edit ${caseFile.caseCode}`}
      subtitle="FICTIONAL training file — never present as real crime."
      current="/admin/fictional"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <AdminActionButton
          label={caseFile.published ? "Unpublish" : "Publish"}
          onAction={() =>
            setFictionalPublished(caseFile.id, !caseFile.published)
          }
        />
        {caseFile.published ? (
          <Link
            href={`/fictional/${caseFile.slug}`}
            className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text"
          >
            View public
          </Link>
        ) : null}
      </div>

      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        Graph: {caseFile._count.suspects} suspects · {caseFile._count.evidence}{" "}
        evidence · {caseFile._count.events} events ·{" "}
        {caseFile._count.witnessStatements} witnesses · solution{" "}
        {caseFile.solution ? "present (server-only)" : "missing"}
      </p>

      <FictionalAdminForm
        initial={{
          id: caseFile.id,
          caseCode: caseFile.caseCode,
          title: caseFile.title,
          slug: caseFile.slug,
          synopsis: caseFile.synopsis,
          setting: caseFile.setting ?? "",
          difficulty: caseFile.difficulty,
          estimatedMinutes:
            caseFile.estimatedMinutes != null
              ? String(caseFile.estimatedMinutes)
              : "",
        }}
      />
    </AdminShell>
  );
}

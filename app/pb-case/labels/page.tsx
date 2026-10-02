import Link from "next/link";
import { PbCaseShell } from "@/components/pb-case/PbCaseShell";
import { getCasesPrisma } from "@/lib/cases-db";
import {
  countWorldDomination,
  WORLD_DOMINATION_MAX,
} from "@/lib/pb-case/world-domination";
import { LabelsForm } from "@/components/pb-case/CaseControls";

export const dynamic = "force-dynamic";

export default async function PbCaseLabelsPage() {
  const db = getCasesPrisma();
  let wdCount = 0;
  let cases: Awaited<ReturnType<typeof db.caseFile.findMany>> = [];
  try {
    wdCount = await countWorldDomination();
    cases = await db.caseFile.findMany({
      orderBy: [{ worldDomination: "desc" }, { title: "asc" }],
      take: 200,
    });
  } catch {
    /* empty */
  }

  return (
    <PbCaseShell
      title="Label manager"
      subtitle={`World Domination slots: ${wdCount}/${WORLD_DOMINATION_MAX} (DB + UI enforced).`}
      current="/pb-case/labels"
    >
      <ul className="space-y-4">
        {cases.map((c) => (
          <li key={c.id} className="border border-border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link
                href={`/pb-case/cases/${c.id}`}
                className="font-mono text-[12px] hover:underline"
              >
                {c.title}
              </Link>
              <span className="font-mono text-[10px] text-text-dim">
                {c.worldDomination ? "WORLD DOMINATION" : c.status}
              </span>
            </div>
            <div className="mt-2">
              <LabelsForm caseId={c.id} labels={c.labels} />
            </div>
          </li>
        ))}
      </ul>
    </PbCaseShell>
  );
}

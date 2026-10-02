import Link from "next/link";
import { getCasesPrisma } from "@/lib/cases-db";
import { CreateCaseForm } from "@/components/pb-case/CreateCaseForm";
import { PbCaseShell } from "@/components/pb-case/PbCaseShell";

export const dynamic = "force-dynamic";

export default async function PbCaseIndexPage() {
  let cases: Awaited<ReturnType<typeof listCases>> = [];
  let dbError: string | null = null;
  try {
    cases = await listCases();
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "CASES_DATABASE_URL unavailable";
  }

  return (
    <PbCaseShell
      title="Cases"
      subtitle="Create stubs, run research (never auto-publishes), review claims/people, then publish."
      current="/pb-case"
    >
      <CreateCaseForm />
      {dbError ? (
        <p className="mt-4 font-mono text-[11px] text-danger">
          Cases DB error: {dbError}
        </p>
      ) : cases.length === 0 ? (
        <p className="mt-4 font-mono text-[11px] text-text-dim">
          No cases yet. Seed World Domination stubs via{" "}
          <code>npm run db:cases:seed</code>.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-border">
          <table className="w-full min-w-[720px] text-left font-mono text-[11px]">
            <thead className="border-b border-border bg-surface/70 text-[9px] uppercase tracking-[0.14em] text-text-dim">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">WD</th>
                <th className="px-3 py-2">Labels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cases.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2">
                    <Link
                      href={`/pb-case/cases/${c.id}`}
                      className="text-text hover:underline"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{c.status}</td>
                  <td className="px-3 py-2 text-text-dim">
                    {c.eventDateText ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {c.worldDomination ? "yes" : "—"}
                  </td>
                  <td className="px-3 py-2 text-text-dim">
                    {c.labels.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PbCaseShell>
  );
}

async function listCases() {
  return getCasesPrisma().caseFile.findMany({
    orderBy: [{ worldDomination: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
}

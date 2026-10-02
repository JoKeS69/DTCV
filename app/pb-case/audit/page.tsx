import { PbCaseShell } from "@/components/pb-case/PbCaseShell";
import { getCasesPrisma } from "@/lib/cases-db";

export const dynamic = "force-dynamic";

export default async function PbCaseAuditPage() {
  let rows: Awaited<
    ReturnType<ReturnType<typeof getCasesPrisma>["auditLog"]["findMany"]>
  > = [];
  try {
    rows = await getCasesPrisma().auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    /* empty */
  }

  return (
    <PbCaseShell
      title="Audit log"
      subtitle="Research / review / publish actions on the cases database."
      current="/pb-case/audit"
    >
      {rows.length === 0 ? (
        <p className="font-mono text-[11px] text-text-dim">No audit events.</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[720px] text-left font-mono text-[11px]">
            <thead className="border-b border-border bg-surface/70 text-[9px] uppercase tracking-[0.14em] text-text-dim">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-text-muted">
                    {row.createdAt.toISOString()}
                  </td>
                  <td className="px-3 py-2">{row.actor}</td>
                  <td className="px-3 py-2">{row.action}</td>
                  <td className="px-3 py-2 text-text-dim">
                    {row.entityType}
                    {row.entityId ? `:${row.entityId}` : ""}
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

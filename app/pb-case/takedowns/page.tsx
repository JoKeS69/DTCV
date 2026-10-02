import { TakedownActions } from "@/components/pb-case/TakedownActions";
import { PbCaseShell } from "@/components/pb-case/PbCaseShell";
import { getCasesPrisma } from "@/lib/cases-db";

export const dynamic = "force-dynamic";

export default async function PbCaseTakedownsPage() {
  let rows: Awaited<
    ReturnType<ReturnType<typeof getCasesPrisma>["takedownRequest"]["findMany"]>
  > = [];
  try {
    rows = await getCasesPrisma().takedownRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch {
    /* empty */
  }

  return (
    <PbCaseShell
      title="Takedown queue"
      subtitle="Copyright / removal requests for research case files."
      current="/pb-case/takedowns"
    >
      {rows.length === 0 ? (
        <p className="font-mono text-[11px] text-text-dim">Queue empty.</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[700px] text-left font-mono text-[11px]">
            <thead className="border-b border-border bg-surface/70 text-[9px] uppercase tracking-[0.14em] text-text-dim">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-text-muted">
                    {row.createdAt.toISOString()}
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.reason}</td>
                  <td className="px-3 py-2 text-text-dim">{row.url ?? "—"}</td>
                  <td className="px-3 py-2">
                    <TakedownActions id={row.id} />
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

import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Takedowns" };

export default async function AdminTakedownsPage() {
  const rows = await getPrisma().takedownLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminShell
      title="Takedown log"
      subtitle="Removals from sync and admin hide actions."
      current="/admin/takedowns"
    >
      {rows.length === 0 ? (
        <p className="font-mono text-[11px] text-text-dim">No takedown events.</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[600px] text-left font-mono text-[11px]">
            <thead className="border-b border-border bg-surface/70 text-[9px] uppercase tracking-[0.14em] text-text-dim">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-text-muted">
                    {row.createdAt.toISOString()}
                  </td>
                  <td className="px-3 py-2">{row.reason}</td>
                  <td className="px-3 py-2 text-text-dim">{row.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

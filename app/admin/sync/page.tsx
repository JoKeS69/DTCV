import type { Metadata } from "next";
import {
  adminForceSyncAll,
  adminForceSyncFbi,
} from "@/app/actions/admin-sync-triggers";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPrisma } from "@/lib/db";
import { SOURCE_REGISTRY } from "@/lib/sources/registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Sync" };

export default async function AdminSyncPage() {
  const runs = await getPrisma().syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 40,
  });

  return (
    <AdminShell
      title="Case sync"
      subtitle="Hourly cron hits /api/cron/sync-cases with CRON_SECRET. Manual force sync below. Failures keep last-good data."
      current="/admin/sync"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <AdminActionButton label="Force sync all" onAction={adminForceSyncAll} />
        <AdminActionButton
          label="Force FBI only"
          onAction={adminForceSyncFbi}
        />
      </div>

      <section className="mb-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Adapters
        </header>
        <ul className="divide-y divide-border">
          {SOURCE_REGISTRY.map((entry) => (
            <li
              key={entry.adapter.source}
              className="px-4 py-3 font-mono text-[11px]"
            >
              <p className="uppercase tracking-[0.12em] text-text">
                {entry.adapter.label}{" "}
                <span className="text-text-dim">
                  · {entry.adapter.isEnabled() ? "enabled" : "disabled"}
                </span>
              </p>
              <p className="mt-1 text-text-muted normal-case tracking-normal">
                {entry.notes}
              </p>
            </li>
          ))}
          <li className="px-4 py-3 font-mono text-[11px] text-text-muted normal-case tracking-normal">
            INTERPOL adapter removed (terms forbid redistribution / bots without
            written permission). CIA Factbook not used.
          </li>
        </ul>
      </section>

      <section className="border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Recent sync runs
        </header>
        {runs.length === 0 ? (
          <p className="px-4 py-6 font-mono text-[11px] text-text-dim">
            No sync runs yet. Trigger cron or force sync above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left font-mono text-[11px]">
              <thead className="border-b border-border text-[9px] uppercase tracking-[0.14em] text-text-dim">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Adapter</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Fetched</th>
                  <th className="px-3 py-2">Upserted</th>
                  <th className="px-3 py-2">Removed</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-3 py-2 text-text-muted">
                      {run.startedAt.toISOString()}
                    </td>
                    <td className="px-3 py-2 uppercase">{run.source}</td>
                    <td className="px-3 py-2">{run.status}</td>
                    <td className="px-3 py-2">{run.fetchedCount}</td>
                    <td className="px-3 py-2">{run.upsertedCount}</td>
                    <td className="px-3 py-2">{run.removedCount}</td>
                    <td className="max-w-[280px] truncate px-3 py-2 text-text-dim">
                      {run.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminAnalytics } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Admin · Analytics" };

export default async function AdminAnalyticsPage() {
  const stats = await getAdminAnalytics();

  const rows = [
    { label: "Users total", value: stats.usersTotal },
    { label: "Users (7d)", value: stats.usersWeek },
    { label: "Published real cases", value: stats.casesPublished },
    { label: "Published fictional", value: stats.fictionalPublished },
    { label: "Discussions (7d)", value: stats.discussionsWeek },
    { label: "Comments (7d)", value: stats.commentsWeek },
    { label: "Active investigations", value: stats.investigationsActive },
    { label: "Submitted theories", value: stats.theoriesSubmitted },
  ];

  return (
    <AdminShell
      title="Analytics"
      subtitle="Lightweight ops counters. Full product analytics can expand later."
      current="/admin/analytics"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="border border-border bg-surface/50 px-4 py-3"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
              {row.label}
            </p>
            <p className="mt-2 font-mono text-2xl text-text">{row.value}</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminOverview } from "@/lib/admin/queries";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview();

  const cards = [
    { label: "Users", value: overview.users, href: "/admin/users", meta: `${overview.suspendedUsers} suspended` },
    { label: "Real cases", value: overview.cases, href: "/admin/cases", meta: `${overview.publishedCases} published · ${overview.featuredCases} featured` },
    { label: "Fictional", value: overview.fictional, href: "/admin/fictional", meta: `${overview.publishedFictional} published` },
    { label: "Open reports", value: overview.reportsOpen, href: "/admin/moderation", meta: "moderation queue" },
    { label: "Discussions", value: overview.discussions, href: "/admin/moderation", meta: "live threads" },
  ];

  return (
    <AdminShell
      title="Command overview"
      subtitle="DETECTIVE ops console. All actions are server-authorized for ADMIN only."
      current="/admin"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border border-border bg-surface/50 px-4 py-3 transition-colors hover:border-border-strong"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
              {card.label}
            </p>
            <p className="mt-2 font-mono text-2xl text-text">{card.value}</p>
            <p className="mt-1 font-mono text-[10px] text-text-muted">{card.meta}</p>
          </Link>
        ))}
      </div>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Subscription snapshot (read-only · Stripe Phase 10)
        </header>
        <ul className="divide-y divide-border">
          {overview.subscriptions.map((row) => (
            <li
              key={row.plan}
              className="flex justify-between px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em]"
            >
              <span className="text-text-dim">{row.plan}</span>
              <span className="text-text">{row.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}

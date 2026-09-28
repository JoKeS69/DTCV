import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Subscriptions" };

export default async function AdminSubscriptionsPage() {
  const [byPlan, recent] = await Promise.all([
    getPrisma().user.groupBy({
      by: ["subscriptionPlan"],
      _count: { _all: true },
    }),
    getPrisma().user.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        username: true,
        displayName: true,
        subscriptionPlan: true,
        createdAt: true,
      },
    }),
  ]);

  const plans = ["FREE", "PREMIUM"] as const;
  const counts = new Map(
    byPlan.map((row) => [row.subscriptionPlan, row._count._all]),
  );

  return (
    <AdminShell
      title="Subscriptions"
      subtitle="Read-only snapshot. Stripe billing lands in Phase 10 — no payment actions here."
      current="/admin/subscriptions"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan}
            className="border border-border bg-surface/50 px-4 py-3"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
              {plan}
            </p>
            <p className="mt-2 font-mono text-2xl text-text">
              {counts.get(plan) ?? 0}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Recent accounts (plan field only)
        </header>
        <ul className="divide-y divide-border">
          {recent.map((user) => (
            <li
              key={user.id}
              className="flex justify-between gap-2 px-4 py-2 font-mono text-[11px]"
            >
              <span className="text-text">
                {user.displayName ?? user.username}{" "}
                <span className="text-text-dim">@{user.username}</span>
              </span>
              <span className="uppercase tracking-[0.12em] text-text-muted">
                {user.subscriptionPlan}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-3 font-mono text-[10px] text-text-dim">
        Phase 10 will wire Stripe Customer / Subscription IDs. Do not collect
        cards here.
      </p>
    </AdminShell>
  );
}

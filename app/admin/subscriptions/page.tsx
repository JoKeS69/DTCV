import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { planLabel } from "@/lib/payments/entitlements";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Subscriptions" };

export default async function AdminSubscriptionsPage() {
  const [byPlan, byStatus, recent, activePro] = await Promise.all([
    getPrisma().user.groupBy({
      by: ["subscriptionPlan"],
      _count: { _all: true },
    }),
    getPrisma().user.groupBy({
      by: ["subscriptionStatus"],
      _count: { _all: true },
    }),
    getPrisma().user.findMany({
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        username: true,
        displayName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        paymentCustomerId: true,
        paymentSubscriptionId: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAtPeriodEnd: true,
      },
    }),
    getPrisma().user.count({
      where: { subscriptionPlan: "PREMIUM", subscriptionStatus: "ACTIVE" },
    }),
  ]);

  const plans = ["FREE", "PREMIUM"] as const;
  const planCounts = new Map(
    byPlan.map((row) => [row.subscriptionPlan, row._count._all]),
  );
  const statusCounts = new Map(
    byStatus.map((row) => [row.subscriptionStatus, row._count._all]),
  );

  return (
    <AdminShell
      title="Subscriptions"
      subtitle="Live Visa billing fields — plan, status, customer/subscription ids, period end. No card data stored."
      current="/admin/subscriptions"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan}
            className="border border-border bg-surface/50 px-4 py-3"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
              {plan === "PREMIUM" ? "Investigator Pro" : "Free"}
            </p>
            <p className="mt-2 font-mono text-2xl text-text">
              {planCounts.get(plan) ?? 0}
            </p>
          </div>
        ))}
        <div className="border border-border bg-surface/50 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
            Active Pro
          </p>
          <p className="mt-2 font-mono text-2xl text-text">{activePro}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
        {(["FREE", "ACTIVE", "CANCELED", "PAST_DUE"] as const).map((s) => (
          <span key={s}>
            {s}: {statusCounts.get(s) ?? 0}
          </span>
        ))}
      </div>

      <section className="mt-4 overflow-x-auto border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Accounts
        </header>
        <table className="w-full min-w-[720px] border-collapse text-left font-mono text-[11px]">
          <thead className="border-b border-border text-[9px] uppercase tracking-[0.14em] text-text-dim">
            <tr>
              <th className="px-3 py-2">Detective</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Period end</th>
              <th className="px-3 py-2">Provider ids</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recent.map((user) => (
              <tr key={user.id} className="bg-surface/30">
                <td className="px-3 py-2 text-text">
                  {user.displayName ?? user.username}
                  <p className="text-[10px] text-text-dim">@{user.username}</p>
                </td>
                <td className="px-3 py-2 text-text-muted">
                  {planLabel(user.subscriptionPlan)}
                </td>
                <td className="px-3 py-2 text-text-muted">
                  {user.subscriptionStatus}
                  {user.subscriptionCancelAtPeriodEnd ? " · canceling" : ""}
                </td>
                <td className="px-3 py-2 text-text-dim normal-case tracking-normal">
                  {user.subscriptionCurrentPeriodEnd
                    ? user.subscriptionCurrentPeriodEnd
                        .toISOString()
                        .slice(0, 10)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-[10px] text-text-dim normal-case tracking-normal break-all">
                  {user.paymentCustomerId ?? "—"}
                  <br />
                  {user.paymentSubscriptionId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}

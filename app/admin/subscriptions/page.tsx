import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBillingControls } from "@/components/billing/AdminBillingControls";
import { evaluateFictionalAccess } from "@/lib/billing/access";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Subscriptions" };

export default async function AdminSubscriptionsPage() {
  const users = await getPrisma().user.findMany({
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      comped: true,
      hasUsedTrial: true,
      trialEndsAt: true,
      accessUntil: true,
      billingPlan: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      paymentCustomerId: true,
      paymentSubscriptionId: true,
    },
  });

  const actions = await getPrisma().billingAdminAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      admin: { select: { username: true } },
      target: { select: { username: true } },
    },
  });

  const withAccess = users.filter((u) =>
    evaluateFictionalAccess({
      role: u.role,
      comped: u.comped,
      trialEndsAt: u.trialEndsAt,
      accessUntil: u.accessUntil,
      hasUsedTrial: u.hasUsedTrial,
      billingPlan: u.billingPlan,
    }).allowed,
  ).length;

  return (
    <AdminShell
      title="Subscriptions"
      subtitle="Fictional access — trial, access_until, comped. Visa/Whish payments only. Never card numbers."
      current="/admin/subscriptions"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="border border-border bg-surface/50 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
            Accounts shown
          </p>
          <p className="mt-2 font-mono text-2xl text-text">{users.length}</p>
        </div>
        <div className="border border-border bg-surface/50 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
            With access
          </p>
          <p className="mt-2 font-mono text-2xl text-text">{withAccess}</p>
        </div>
        <div className="border border-border bg-surface/50 px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
            Comped
          </p>
          <p className="mt-2 font-mono text-2xl text-text">
            {users.filter((u) => u.comped).length}
          </p>
        </div>
      </div>

      <section className="mt-4 overflow-x-auto border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Accounts (read-only status + admin grant/extend)
        </header>
        <table className="w-full min-w-[880px] border-collapse text-left font-mono text-[11px]">
          <thead className="border-b border-border text-[9px] uppercase tracking-[0.14em] text-text-dim">
            <tr>
              <th className="px-3 py-2">Detective</th>
              <th className="px-3 py-2">Access</th>
              <th className="px-3 py-2">Trial / until</th>
              <th className="px-3 py-2">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              const decision = evaluateFictionalAccess({
                role: user.role,
                comped: user.comped,
                trialEndsAt: user.trialEndsAt,
                accessUntil: user.accessUntil,
                hasUsedTrial: user.hasUsedTrial,
                billingPlan: user.billingPlan,
              });
              return (
                <tr key={user.id} className="bg-surface/30 align-top">
                  <td className="px-3 py-2 text-text">
                    {user.displayName ?? user.username}
                    <p className="text-[10px] text-text-dim">
                      @{user.username} · {user.role}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {decision.status}
                    {user.comped ? " · COMPED" : ""}
                    {user.billingPlan ? ` · ${user.billingPlan}` : ""}
                  </td>
                  <td className="px-3 py-2 text-text-dim normal-case tracking-normal">
                    trial:{" "}
                    {user.trialEndsAt
                      ? user.trialEndsAt.toISOString().slice(0, 10)
                      : user.hasUsedTrial
                        ? "used"
                        : "—"}
                    <br />
                    until:{" "}
                    {user.accessUntil
                      ? user.accessUntil.toISOString().slice(0, 10)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {user.role === "ADMIN" ? (
                      <span className="text-text-dim">Admin bypass</span>
                    ) : (
                      <AdminBillingControls
                        userId={user.id}
                        comped={user.comped}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Admin actions log
        </header>
        <ul className="divide-y divide-border font-mono text-[11px]">
          {actions.length === 0 ? (
            <li className="px-4 py-3 text-text-muted">No admin billing actions yet.</li>
          ) : (
            actions.map((a) => (
              <li key={a.id} className="px-4 py-2 text-text-muted">
                <span className="text-text">@{a.admin.username}</span> → @
                {a.target.username}: {a.action} — {a.reason}
                <span className="ml-2 text-text-dim normal-case tracking-normal">
                  {a.createdAt.toISOString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </AdminShell>
  );
}

import type { Metadata } from "next";
import { setUserRole, setUserSuspended } from "@/app/actions/admin";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatDetectiveBadge, rankLabel } from "@/lib/progression/ranks";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const users = await getPrisma().user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      username: true,
      displayName: true,
      publicId: true,
      role: true,
      detectiveXP: true,
      detectiveRank: true,
      subscriptionPlan: true,
      suspendedAt: true,
      createdAt: true,
    },
  });

  return (
    <AdminShell
      title="Users"
      subtitle="Suspend accounts and manage roles. Suspended users cannot sign in."
      current="/admin/users"
    >
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[720px] border-collapse text-left font-mono text-[11px]">
          <thead className="border-b border-border bg-surface/70 text-[9px] uppercase tracking-[0.14em] text-text-dim">
            <tr>
              <th className="px-3 py-2">Detective</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">XP / Rank</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="bg-surface/30">
                <td className="px-3 py-2">
                  <p className="text-text">
                    {user.displayName ?? user.username}
                  </p>
                  <p className="text-[10px] text-text-dim">
                    {formatDetectiveBadge(user.publicId)} · @{user.username}
                  </p>
                </td>
                <td className="px-3 py-2 text-text">{user.role}</td>
                <td className="px-3 py-2 text-text-muted">
                  {user.detectiveXP} · {rankLabel(user.detectiveRank)}
                </td>
                <td className="px-3 py-2 text-text-muted">
                  {user.subscriptionPlan}
                </td>
                <td className="px-3 py-2">
                  {user.suspendedAt ? (
                    <span className="text-danger">Suspended</span>
                  ) : (
                    <span className="text-online">Active</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <AdminActionButton
                      label={user.suspendedAt ? "Unsuspend" : "Suspend"}
                      danger={!user.suspendedAt}
                      onAction={setUserSuspended.bind(
                        null,
                        user.id,
                        !user.suspendedAt,
                      )}
                    />
                    {user.role !== "ADMIN" ? (
                      <AdminActionButton
                        label="Make admin"
                        onAction={setUserRole.bind(null, user.id, "ADMIN")}
                      />
                    ) : null}
                    {user.role === "USER" ? (
                      <AdminActionButton
                        label="Moderator"
                        onAction={setUserRole.bind(null, user.id, "MODERATOR")}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

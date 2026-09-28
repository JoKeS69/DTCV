import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import type { UserRole } from "@/lib/generated/prisma/client";

export type AdminUser = {
  id: string;
  username: string;
  role: UserRole;
};

/**
 * Server-side ADMIN gate. Never trust client role claims.
 * Redirects unauthenticated users to login; non-admins to /cases.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true, suspendedAt: true },
  });

  if (!user || user.suspendedAt) {
    redirect("/login?callbackUrl=/admin");
  }
  if (user.role !== "ADMIN") {
    redirect("/cases");
  }

  return { id: user.id, username: user.username, role: user.role };
}

export async function requireAdminAction(): Promise<
  | { ok: true; admin: AdminUser }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in required" };
  }
  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true, suspendedAt: true },
  });
  if (!user || user.suspendedAt) {
    return { ok: false, error: "Sign in required" };
  }
  if (user.role !== "ADMIN") {
    return { ok: false, error: "Admin access required" };
  }
  return {
    ok: true,
    admin: { id: user.id, username: user.username, role: user.role },
  };
}

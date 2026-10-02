/**
 * Case-research /pb-case admin gate.
 * Access ONLY for username matching ADMIN_USERNAME (default: abed)
 * AND UserRole.ADMIN on the main site DB. Non-admins → notFound (404).
 */

import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import type { UserRole } from "@/lib/generated/prisma/client";
import { isPbCaseAdminUsername } from "@/lib/pb-case/admin-username";

export {
  getAdminUsername,
  isPbCaseAdminUsername,
  PB_CASE_ADMIN_USERNAME_DEFAULT,
} from "@/lib/pb-case/admin-username";

export type PbCaseAdmin = {
  id: string;
  username: string;
  role: UserRole;
};

/**
 * Server-side gate for /pb-case pages. Returns 404 for logged-out / non-admin.
 */
export async function requirePbCaseAdmin(): Promise<PbCaseAdmin> {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true, suspendedAt: true },
  });

  if (!user || user.suspendedAt) {
    notFound();
  }
  if (user.role !== "ADMIN" || !isPbCaseAdminUsername(user.username)) {
    notFound();
  }

  return { id: user.id, username: user.username, role: user.role };
}

export async function requirePbCaseAdminAction(): Promise<
  | { ok: true; admin: PbCaseAdmin }
  | { ok: false; error: string; status: 401 | 403 | 404 }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not found", status: 404 };
  }
  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true, suspendedAt: true },
  });
  if (!user || user.suspendedAt) {
    return { ok: false, error: "Not found", status: 404 };
  }
  if (user.role !== "ADMIN" || !isPbCaseAdminUsername(user.username)) {
    return { ok: false, error: "Not found", status: 404 };
  }
  return {
    ok: true,
    admin: { id: user.id, username: user.username, role: user.role },
  };
}

/**
 * Case-research /pb-case admin gate.
 * Access ONLY for username matching ADMIN_USERNAME (default: abed)
 * AND UserRole.ADMIN on the main site DB. Non-admins → notFound (404).
 */

import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import type { UserRole } from "@/lib/generated/prisma/client";
import {
  canAccessPbCase,
  getAdminUsername,
} from "@/lib/pb-case/admin-username";

export {
  canAccessPbCase,
  getAdminUsername,
  isPbCaseAdminUsername,
  PB_CASE_ADMIN_USERNAME_DEFAULT,
} from "@/lib/pb-case/admin-username";

export type PbCaseAdmin = {
  id: string;
  username: string;
  role: UserRole;
};

function logPbCaseGateDeny(
  reason: string,
  detail: Record<string, string | undefined> = {},
): void {
  if (process.env.NODE_ENV !== "development") return;
  const bits = Object.entries(detail)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.warn(`[pb-case] gate 404: ${reason}${bits ? ` (${bits})` : ""}`);
}

/**
 * Server-side gate for /pb-case pages. Returns 404 for logged-out / non-admin.
 */
export async function requirePbCaseAdmin(): Promise<PbCaseAdmin> {
  const session = await auth();
  if (!session?.user?.id) {
    logPbCaseGateDeny("no session");
    notFound();
  }

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true, suspendedAt: true },
  });

  if (!user || user.suspendedAt) {
    logPbCaseGateDeny("missing or suspended user", {
      sessionId: session.user.id,
      sessionUsername: session.user.username,
    });
    notFound();
  }

  if (!canAccessPbCase(user)) {
    if (user.role === "ADMIN") {
      logPbCaseGateDeny("ADMIN username mismatch", {
        dbUsername: user.username,
        adminUsername: getAdminUsername(),
        sessionUsername: session.user.username,
      });
    } else {
      logPbCaseGateDeny("role not ADMIN", {
        dbUsername: user.username,
        role: user.role,
      });
    }
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
  if (!canAccessPbCase(user)) {
    if (process.env.NODE_ENV === "development" && user.role === "ADMIN") {
      logPbCaseGateDeny("ADMIN username mismatch (action)", {
        dbUsername: user.username,
        adminUsername: getAdminUsername(),
        sessionUsername: session.user.username,
      });
    }
    return { ok: false, error: "Not found", status: 404 };
  }
  return {
    ok: true,
    admin: { id: user.id, username: user.username, role: user.role },
  };
}

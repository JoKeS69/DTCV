import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import {
  allowDevAuthLinks,
  safeCallbackPath,
} from "@/lib/security/callback";
import type { UserRole } from "@/lib/generated/prisma/client";

export type ActiveUser = {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
};

export { allowDevAuthLinks, safeCallbackPath };

/**
 * Session + DB gate: rejects missing session and suspended accounts.
 * Use on every mutating server action (not just login).
 */
export async function requireActiveUser(): Promise<
  | { ok: true; user: ActiveUser }
  | { ok: false; error: string; user?: undefined }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in required" };
  }

  const row = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      suspendedAt: true,
    },
  });

  if (!row || row.suspendedAt) {
    return { ok: false, error: "Account suspended or unavailable" };
  }

  return {
    ok: true,
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
    },
  };
}

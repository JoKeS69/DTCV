import { auth } from "@/auth";
import { openEmail } from "@/lib/crypto/email";
import { getPrisma } from "@/lib/db";
import {
  allowDevAuthLinks,
  safeCallbackPath,
} from "@/lib/security/callback";
import type { UserRole } from "@/lib/generated/prisma/client";

export type ActiveUser = {
  id: string;
  username: string;
  /** Decrypted email for owner/staff server use only — never send to public APIs. */
  email: string | null;
  role: UserRole;
  publicId: string;
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
      emailEncrypted: true,
      role: true,
      suspendedAt: true,
      publicId: true,
      sessionVersion: true,
    },
  });

  if (!row || row.suspendedAt) {
    return { ok: false, error: "Account suspended or unavailable" };
  }

  // JWT sessionVersion mismatch → treat as signed out
  if (
    typeof session.user.sessionVersion === "number" &&
    session.user.sessionVersion !== row.sessionVersion
  ) {
    return { ok: false, error: "Session expired — sign in again" };
  }

  let email: string | null = null;
  if (row.emailEncrypted) {
    try {
      email = openEmail(row.emailEncrypted);
    } catch {
      email = null;
    }
  } else if (row.email) {
    email = row.email;
  }

  return {
    ok: true,
    user: {
      id: row.id,
      username: row.username,
      email,
      role: row.role,
      publicId: row.publicId,
    },
  };
}

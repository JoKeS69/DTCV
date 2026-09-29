import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import type { UserRole } from "@/lib/generated/prisma/client";

export type ActiveUser = {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
};

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

/** Safe same-origin relative redirect path (blocks //evil open redirects). */
export function safeCallbackPath(
  raw: string | null | undefined,
  fallback = "/profile",
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  // Must be a single-root relative path: /foo — not //host, /\, or protocol-relative.
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;
  if (!/^\/[A-Za-z0-9/_\-.?=&%]*$/.test(value)) return fallback;
  return value;
}

/** Dev-only: expose reset/verify links when email provider is a placeholder. */
export function allowDevAuthLinks(): boolean {
  const placeholder = process.env.AUTH_EMAIL_PLACEHOLDER?.trim() === "true";
  const prod =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  return placeholder && !prod;
}

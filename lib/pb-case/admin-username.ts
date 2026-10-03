/** Pure helpers for /pb-case admin username checks (no Next.js imports). */

export const PB_CASE_ADMIN_USERNAME_DEFAULT = "abed";

export function getAdminUsername(): string {
  return (
    process.env.ADMIN_USERNAME?.trim().toLowerCase() ||
    PB_CASE_ADMIN_USERNAME_DEFAULT
  );
}

export function isPbCaseAdminUsername(
  username: string | null | undefined,
): boolean {
  if (!username) return false;
  return username.trim().toLowerCase() === getAdminUsername();
}

export type PbCaseGateUser = {
  role: string;
  username: string | null | undefined;
  suspendedAt?: Date | string | null;
};

/**
 * Single predicate for /pb-case page gate AND CommandDeck chrome.
 * Must stay identical in both call sites — ADMIN role alone is not enough.
 */
export function canAccessPbCase(user: PbCaseGateUser): boolean {
  if (user.suspendedAt) return false;
  return user.role === "ADMIN" && isPbCaseAdminUsername(user.username);
}

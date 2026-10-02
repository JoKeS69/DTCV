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

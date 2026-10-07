/**
 * Local-dev convenience for ADMIN role credentials.
 *
 * Runtime access gates must keep using role/flags (never hardcode usernames).
 * This helper is only for Credentials `authorize` password acceptance:
 * ADMIN users may sign in with an empty password or the local special `@!@`,
 * or with a password that matches their stored hash.
 *
 * Seed / `db:reset-abed` write an Argon2id hash of `@!@` by default so the
 * hash path also works after a fresh reset.
 */
export const ADMIN_LOCAL_SPECIAL_PASSWORD = "@!@";

export function isAdminLocalPasswordBypass(
  role: string | null | undefined,
  password: string,
): boolean {
  if (role !== "ADMIN") return false;
  return password === "" || password === ADMIN_LOCAL_SPECIAL_PASSWORD;
}

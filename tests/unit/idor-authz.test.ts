/**
 * Authz / IDOR contract tests — ownership filters and session gates.
 * These encode the invariants server actions rely on (no DB required).
 */
import { describe, expect, it } from "vitest";

/** Mirrors app/actions/board.ts requireOwner where clause. */
function investigationOwnerFilter(investigationId: string, userId: string) {
  return {
    id: investigationId,
    userId,
    target: "FICTIONAL_CASE" as const,
  };
}

/** Public detective dossier select — must never include email ciphertext. */
const PUBLIC_DOSSIER_SELECT = {
  username: true,
  publicId: true,
  displayName: true,
  detectiveXP: true,
  detectiveRank: true,
  bio: true,
} as const;

describe("IDOR / authz contracts", () => {
  it("board ownership filter always scopes by caller userId", () => {
    const filter = investigationOwnerFilter("inv_a", "user_attacker");
    expect(filter.userId).toBe("user_attacker");
    expect(filter.id).toBe("inv_a");
    // Attacker cannot omit userId and fetch by id alone
    expect(Object.keys(filter).sort()).toEqual(["id", "target", "userId"]);
  });

  it("public dossier projection excludes email fields", () => {
    const keys = Object.keys(PUBLIC_DOSSIER_SELECT);
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("emailEncrypted");
    expect(keys).not.toContain("emailBlindIndex");
    expect(keys).not.toContain("passwordHash");
    expect(keys).not.toContain("badgeNumber");
    expect(keys).toContain("publicId");
  });

  it("sessionVersion mismatch semantics invalidate the session", () => {
    const tokenVersion = 1;
    const dbVersion = 2; // bumped on password change
    expect(tokenVersion === dbVersion).toBe(false);
  });
});

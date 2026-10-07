import { describe, expect, it } from "vitest";
import {
  ADMIN_LOCAL_SPECIAL_PASSWORD,
  isAdminLocalPasswordBypass,
} from "@/lib/auth/admin-local-password";

describe("isAdminLocalPasswordBypass", () => {
  it("allows empty and @!@ for ADMIN only", () => {
    expect(isAdminLocalPasswordBypass("ADMIN", "")).toBe(true);
    expect(
      isAdminLocalPasswordBypass("ADMIN", ADMIN_LOCAL_SPECIAL_PASSWORD),
    ).toBe(true);
    expect(isAdminLocalPasswordBypass("ADMIN", "detective-abed-2026")).toBe(
      false,
    );
  });

  it("never bypasses USER or MODERATOR", () => {
    expect(isAdminLocalPasswordBypass("USER", "")).toBe(false);
    expect(isAdminLocalPasswordBypass("USER", "@!@")).toBe(false);
    expect(isAdminLocalPasswordBypass("MODERATOR", "")).toBe(false);
    expect(isAdminLocalPasswordBypass(undefined, "")).toBe(false);
  });
});

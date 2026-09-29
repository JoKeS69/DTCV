import { describe, expect, it } from "vitest";
import {
  detectPasswordAlgo,
  hashPassword,
  hashPasswordBcryptLegacy,
  needsRehash,
  verifyPassword,
} from "@/lib/password";

describe("password Argon2id + bcrypt migrate", () => {
  it("hashes new passwords with Argon2id", async () => {
    const hash = await hashPassword("detective-demo-2026");
    expect(detectPasswordAlgo(hash)).toBe("argon2id");
    expect(needsRehash(hash)).toBe(false);
    expect(await verifyPassword("detective-demo-2026", hash)).toBe(true);
    expect(await verifyPassword("wrong-password-xx", hash)).toBe(false);
  });

  it("verifies legacy bcrypt and flags rehash", async () => {
    const legacy = await hashPasswordBcryptLegacy("legacy-pass-2026");
    expect(detectPasswordAlgo(legacy)).toBe("bcrypt");
    expect(needsRehash(legacy)).toBe(true);
    expect(await verifyPassword("legacy-pass-2026", legacy)).toBe(true);
    expect(await verifyPassword("nope", legacy)).toBe(false);
  });
});

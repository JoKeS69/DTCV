import { describe, expect, it } from "vitest";
import {
  formString,
  parseRegisterFormData,
} from "@/lib/auth/register-input";

function fakeForm(entries: Record<string, FormDataEntryValue | null>) {
  return {
    get(name: string) {
      return entries[name] ?? null;
    },
  };
}

describe("formString", () => {
  it("trims strings and rejects empty/non-string", () => {
    expect(formString("  alice  ")).toBe("alice");
    expect(formString("")).toBeUndefined();
    expect(formString("   ")).toBeUndefined();
    expect(formString(null)).toBeUndefined();
    expect(formString(undefined)).toBeUndefined();
  });
});

describe("parseRegisterFormData", () => {
  it("parses username+password and lowercases username", () => {
    const result = parseRegisterFormData(
      fakeForm({
        username: "Detective_One",
        password: "secure-pass-2026",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.username).toBe("detective_one");
      expect(result.data.password).toBe("secure-pass-2026");
      // Guarantees Prisma findUnique({ where: { username } }) never sees undefined.
      expect(typeof result.data.username).toBe("string");
      expect(result.data.username.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("rejects missing username/password with clear errors", () => {
    expect(parseRegisterFormData(fakeForm({})).ok).toBe(false);
    expect(parseRegisterFormData(fakeForm({})).error).toMatch(/username/i);
    expect(
      parseRegisterFormData(fakeForm({ username: "alice" })).error,
    ).toMatch(/password/i);
    expect(
      parseRegisterFormData(
        fakeForm({ username: "ab", password: "long-enough-password" }),
      ).error,
    ).toMatch(/at least 3/i);
    expect(
      parseRegisterFormData(
        fakeForm({ username: "alice!", password: "long-enough-password" }),
      ).error,
    ).toMatch(/letters, numbers, underscore/i);
    expect(
      parseRegisterFormData(
        fakeForm({ username: "alice", password: "short" }),
      ).error,
    ).toMatch(/at least 8/i);
  });

  it("does not invent email fields", () => {
    const result = parseRegisterFormData(
      fakeForm({
        username: "noir_case",
        password: "secure-pass-2026",
        email: "should-be-ignored@example.com",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        username: "noir_case",
        password: "secure-pass-2026",
      });
      expect("email" in result.data).toBe(false);
    }
  });
});

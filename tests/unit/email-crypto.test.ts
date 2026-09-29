import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  lookupEmailBlindIndex,
  openEmail,
  sealEmail,
} from "@/lib/crypto/email";
import { encryptString, isEncryptedPayload, openPrivateText, sealPrivateText } from "@/lib/crypto/aead";

describe("email AEAD + blind index", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "unit-test-auth-secret-with-enough-length");
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-encryption-key-32b!!!!");
    vi.stubEnv("EMAIL_BLIND_INDEX_KEY", "unit-test-blind-index-key-32b!!!");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("seals email so ciphertext is not plaintext", () => {
    const email = "Detective@Example.COM";
    const sealed = sealEmail(email);
    expect(sealed.emailEncrypted).toMatch(/^v1:/);
    expect(isEncryptedPayload(sealed.emailEncrypted)).toBe(true);
    expect(sealed.emailEncrypted.toLowerCase()).not.toContain("detective@example.com");
    expect(openEmail(sealed.emailEncrypted)).toBe("detective@example.com");
  });

  it("blind index is deterministic and case-insensitive", () => {
    const a = lookupEmailBlindIndex("User@Example.com");
    const b = lookupEmailBlindIndex("user@example.com");
    expect(a).toBe(b);
    expect(a).not.toContain("@");
    expect(a).not.toBe(lookupEmailBlindIndex("other@example.com"));
  });

  it("never returns ciphertext from openEmail (plaintext only)", () => {
    const sealed = sealEmail("owner@detective.local");
    const opened = openEmail(sealed.emailEncrypted);
    expect(opened).toBe("owner@detective.local");
    expect(opened.startsWith("v1:")).toBe(false);
  });

  it("seals private notes with legacy plaintext fallback", () => {
    const sealed = sealPrivateText("private investigation note");
    expect(sealed).toMatch(/^v1:/);
    expect(openPrivateText(sealed)).toBe("private investigation note");
    expect(openPrivateText("legacy plaintext note")).toBe("legacy plaintext note");
    expect(encryptString("x")).toMatch(/^v1:/);
  });
});

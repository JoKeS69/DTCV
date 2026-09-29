import { afterEach, describe, expect, it, vi } from "vitest";
import { allowDevAuthLinks, safeCallbackPath } from "@/lib/security/callback";

describe("safeCallbackPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeCallbackPath("/profile")).toBe("/profile");
    expect(safeCallbackPath("/cases/foo")).toBe("/cases/foo");
    expect(safeCallbackPath("/billing?checkout=success")).toBe(
      "/billing?checkout=success",
    );
  });

  it("rejects open redirects", () => {
    expect(safeCallbackPath("//evil.com")).toBe("/profile");
    expect(safeCallbackPath("/\\evil.com")).toBe("/profile");
    expect(safeCallbackPath("https://evil.com")).toBe("/profile");
    expect(safeCallbackPath("javascript:alert(1)")).toBe("/profile");
    expect(safeCallbackPath("")).toBe("/profile");
    expect(safeCallbackPath(null)).toBe("/profile");
  });

  it("honors custom fallback", () => {
    expect(safeCallbackPath("//x", "/cases")).toBe("/cases");
  });
});

describe("allowDevAuthLinks", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows only when placeholder is true and not production", () => {
    vi.stubEnv("AUTH_EMAIL_PLACEHOLDER", "true");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    expect(allowDevAuthLinks()).toBe(true);
  });

  it("blocks in production even with placeholder", () => {
    vi.stubEnv("AUTH_EMAIL_PLACEHOLDER", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(allowDevAuthLinks()).toBe(false);
  });

  it("blocks when placeholder is off", () => {
    vi.stubEnv("AUTH_EMAIL_PLACEHOLDER", "false");
    vi.stubEnv("NODE_ENV", "development");
    expect(allowDevAuthLinks()).toBe(false);
  });
});

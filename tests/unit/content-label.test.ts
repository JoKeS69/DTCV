import { describe, expect, it } from "vitest";
import { forceUserTheoryLabel } from "@/lib/community/queries";

describe("forceUserTheoryLabel", () => {
  it("never elevates client labels to VERIFIED", () => {
    expect(forceUserTheoryLabel("VERIFIED")).toBe("USER_THEORY");
    expect(forceUserTheoryLabel("USER_THEORY")).toBe("USER_THEORY");
    expect(forceUserTheoryLabel("REPORTED")).toBe("REPORTED");
    expect(forceUserTheoryLabel(undefined)).toBe("USER_THEORY");
  });
});

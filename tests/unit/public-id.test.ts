import { describe, expect, it } from "vitest";
import {
  formatPublicDetectiveId,
  generatePublicDetectiveId,
} from "@/lib/identity/public-id";
import { formatDetectiveBadge } from "@/lib/progression/ranks";

describe("opaque public detective IDs", () => {
  it("generates DET-XXXXXXXX opaque ids", () => {
    const id = generatePublicDetectiveId();
    expect(id).toMatch(/^DET-[A-Z2-9]{8}$/);
    expect(id).not.toMatch(/[01IO]/);
  });

  it("formats public dossier labels without sequential badge numbers", () => {
    expect(formatPublicDetectiveId("DET-ABCD2345")).toBe("DET-ABCD2345");
    expect(formatDetectiveBadge("DET-ABCD2345")).toBe("DET-ABCD2345");
    // Numeric path is internal-only labeling
    expect(formatDetectiveBadge(42)).toBe("INTERNAL-0042");
  });

  it("does not collide trivially across samples", () => {
    const set = new Set(Array.from({ length: 40 }, () => generatePublicDetectiveId()));
    expect(set.size).toBe(40);
  });
});

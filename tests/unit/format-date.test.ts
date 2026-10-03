import { describe, expect, it } from "vitest";
import {
  coerceDate,
  formatDateOnly,
  formatDateTime,
} from "@/lib/format-date";

describe("formatDate*", () => {
  it("formats Date and ISO string the same way", () => {
    const iso = "2026-09-28T23:50:31.909Z";
    expect(formatDateTime(new Date(iso))).toBe(iso);
    expect(formatDateTime(iso)).toBe(iso);
    expect(formatDateOnly(iso)).toBe("2026-09-28");
  });

  it("formats epoch ms", () => {
    const iso = "2026-09-28T23:50:31.909Z";
    expect(formatDateTime(Date.parse(iso))).toBe(iso);
  });

  it("handles null", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateOnly(undefined)).toBe("—");
  });

  it("coerceDate returns null for invalid input", () => {
    expect(coerceDate("not-a-date")).toBeNull();
    expect(coerceDate(undefined)).toBeNull();
    expect(coerceDate("2026-09-28T23:50:31.909Z")?.toISOString()).toBe(
      "2026-09-28T23:50:31.909Z",
    );
  });
});


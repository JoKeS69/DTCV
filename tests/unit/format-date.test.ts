import { describe, expect, it } from "vitest";
import { formatDateOnly, formatDateTime } from "@/lib/format-date";

describe("formatDate*", () => {
  it("formats Date and ISO string the same way", () => {
    const iso = "2026-09-28T23:50:31.909Z";
    expect(formatDateTime(new Date(iso))).toBe(iso);
    expect(formatDateTime(iso)).toBe(iso);
    expect(formatDateOnly(iso)).toBe("2026-09-28");
  });

  it("handles null", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateOnly(undefined)).toBe("—");
  });
});

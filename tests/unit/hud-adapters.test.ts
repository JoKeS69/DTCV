import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatClock,
  formatRelativeLabel,
  toHudActivity,
  toHudCase,
  toHudDiscussions,
} from "@/lib/cases/hud-adapters";

describe("hud-adapters date coercion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T16:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formatRelativeLabel accepts Date, ISO string, and epoch ms", () => {
    const iso = "2026-10-03T15:30:00.000Z";
    expect(formatRelativeLabel(new Date(iso))).toBe("30 MIN AGO");
    expect(formatRelativeLabel(iso)).toBe("30 MIN AGO");
    expect(formatRelativeLabel(Date.parse(iso))).toBe("30 MIN AGO");
  });

  it("formatRelativeLabel returns — for invalid dates", () => {
    expect(formatRelativeLabel("not-a-date")).toBe("—");
    expect(formatRelativeLabel(Number.NaN)).toBe("—");
    expect(formatRelativeLabel(null)).toBe("—");
    expect(formatRelativeLabel(undefined)).toBe("—");
  });

  it("formatClock accepts string timestamps and invalid input", () => {
    expect(formatClock("2026-10-03T15:30:45.000Z")).toBe("15:30:45");
    expect(formatClock("bogus")).toBe("--:--:--");
  });

  it("toHudCase works when updatedAt is an ISO string (cache/JSON)", () => {
    const hud = toHudCase({
      id: "1",
      caseCode: "CASE-001",
      slug: "case-001",
      title: "Test",
      location: null,
      countryCode: "US",
      type: "MISSING",
      status: "OPEN",
      updatedAt: "2026-10-03T15:00:00.000Z",
      priority: "HIGH",
      summary: "Overview",
    });
    expect(hud.updatedAt).toBe("2026-10-03T15:00:00.000Z");
    expect(hud.updatedLabel).toBe("01 HRS AGO");
  });

  it("toHudActivity works when at is a string", () => {
    const items = toHudActivity([
      {
        id: "a1",
        at: "2026-10-03T12:34:56.000Z",
        text: "Case updated",
      },
    ]);
    expect(items[0]?.time).toBe("12:34:56");
  });

  it("toHudDiscussions works when createdAt is a string", () => {
    const items = toHudDiscussions([
      {
        id: "d1",
        body: "hello",
        createdAt: "2026-10-03T15:45:00.000Z",
        author: { username: "abed" },
        _count: { comments: 2 },
      },
    ]);
    expect(items[0]?.createdLabel).toBe("15 MIN AGO");
    expect(items[0]?.replyCount).toBe(2);
  });
});

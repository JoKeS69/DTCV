import { describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/fbi/normalize-samples.json";
import {
  fbiSubjectsAllowed,
  mapFbiCaseType,
  mapFbiCategory,
  mapFbiStatus,
  normalizeFbiItem,
} from "@/lib/sources/normalize/fbi";

describe("FBI normalizer (real API fixtures)", () => {
  it("loads captured fixture items", () => {
    expect(fixture.items.length).toBeGreaterThan(0);
  });

  it("normalizes each fixture item defensively", () => {
    for (const raw of fixture.items) {
      const subjects = (raw.subjects as string[]) ?? [];
      if (!fbiSubjectsAllowed(subjects)) {
        expect(normalizeFbiItem(raw)).toBeNull();
        continue;
      }
      const n = normalizeFbiItem(raw);
      expect(n).not.toBeNull();
      expect(n!.source).toBe("fbi");
      expect(n!.sourceId).toBeTruthy();
      expect(n!.sourceUrl).toMatch(/^https:\/\/www\.fbi\.gov\//);
      expect(n!.sourceAttribution).toMatch(/FBI/i);
      expect(n!.name.length).toBeGreaterThan(0);
      expect(n!.contentHash).toHaveLength(64);
      expect(n!.caseType).toBeTruthy();
      expect(n!.sourcedStatus).toBeTruthy();
    }
  });

  it("maps statuses null-safely", () => {
    expect(mapFbiStatus(null)).toBe("ACTIVE");
    expect(mapFbiStatus("captured")).toBe("CAPTURED");
    expect(mapFbiStatus("na")).toBe("ACTIVE");
  });

  it("maps categories and types from subjects", () => {
    expect(mapFbiCategory(["Ten Most Wanted Fugitives"])).toBe(
      "TEN_MOST_WANTED",
    );
    expect(mapFbiCaseType(["Ten Most Wanted Fugitives"])).toBe("WANTED");
    expect(mapFbiCaseType(["ViCAP Unidentified Persons"])).toBe("UNIDENTIFIED");
    expect(mapFbiCaseType(["Seeking Information"])).toBe("SEEKING_INFORMATION");
    expect(mapFbiCaseType(["Most Wanted Terrorists"])).toBe("TERRORIST");
  });

  it("excludes art crime subjects", () => {
    expect(fbiSubjectsAllowed(["Art Crime"])).toBe(false);
    expect(
      fbiSubjectsAllowed(["Kidnappings and Missing Persons"]),
    ).toBe(true);
  });

  it("returns null for incomplete items", () => {
    expect(normalizeFbiItem({})).toBeNull();
    expect(
      normalizeFbiItem({
        uid: "x",
        title: "Y",
        // missing url
        subjects: ["Seeking Information"],
      }),
    ).toBeNull();
  });
});

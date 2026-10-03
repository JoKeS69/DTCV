import { describe, expect, it } from "vitest";
import {
  caseCodeForResearch,
  mapPersonRole,
  yearFromResearch,
} from "@/lib/pb-case/sync-public-case";

describe("sync-public-case helpers", () => {
  it("maps research person roles onto CasePersonRole", () => {
    expect(mapPersonRole("victim")).toBe("VICTIM");
    expect(mapPersonRole("Person of Interest")).toBe("PERSON_OF_INTEREST");
    expect(mapPersonRole("poi")).toBe("PERSON_OF_INTEREST");
    expect(mapPersonRole("witness")).toBe("WITNESS");
    expect(mapPersonRole("relative")).toBe("RELATIVE");
    expect(mapPersonRole("journalist")).toBe("OTHER");
  });

  it("derives year from eventDate or eventDateText", () => {
    expect(
      yearFromResearch({
        eventDate: new Date("2001-09-11T00:00:00.000Z"),
        eventDateText: null,
      }),
    ).toBe(2001);
    expect(
      yearFromResearch({
        eventDate: null,
        eventDateText: "14 February 2005",
      }),
    ).toBe(2005);
    expect(
      yearFromResearch({ eventDate: null, eventDateText: "unknown" }),
    ).toBeNull();
  });

  it("builds stable PB- case codes from research ids", () => {
    const code = caseCodeForResearch("clxyz0123456789abcdef");
    expect(code.startsWith("PB-")).toBe(true);
    expect(code.length).toBeLessThanOrEqual(64);
  });
});

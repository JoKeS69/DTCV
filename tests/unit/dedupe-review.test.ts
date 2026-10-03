import { describe, expect, it } from "vitest";
import {
  claimSimilarity,
  normalizePersonName,
  planClaimCollapse,
  planPersonCollapse,
} from "@/lib/pb-case/dedupe-review";

describe("dedupe-review", () => {
  it("normalizes person titles", () => {
    expect(normalizePersonName("Mr. Lee Harvey Oswald")).toBe(
      normalizePersonName("Lee Harvey Oswald"),
    );
  });

  it("scores near-duplicate claims highly", () => {
    const a =
      "President Kennedy was assassinated in Dallas, Texas, on 22 November 1963.";
    const b =
      "President Kennedy was assassinated in Dallas Texas on November 22 1963.";
    expect(claimSimilarity(a, b)).toBeGreaterThanOrEqual(0.78);
  });

  it("collapses duplicate people keeping approved", () => {
    const plans = planPersonCollapse([
      {
        id: "1",
        name: "John F. Kennedy",
        status: "rejected",
        role: "other",
        legalStatus: "deceased",
        sources: [],
      },
      {
        id: "2",
        name: "John F. Kennedy",
        status: "pending",
        role: "victim",
        legalStatus: "deceased",
        sources: ["https://www.archives.gov/"],
      },
      {
        id: "3",
        name: "John F. Kennedy",
        status: "approved",
        role: "victim",
        legalStatus: "deceased",
        sources: [],
      },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].survivorId).toBe("3");
    expect(plans[0].deleteIds.sort()).toEqual(["1", "2"]);
    expect(plans[0].role).toBe("victim");
  });

  it("collapses near-duplicate claims", () => {
    const plans = planClaimCollapse([
      {
        id: "a",
        text: "Oswald shot Kennedy in Dallas.",
        status: "pending",
        disputed: false,
        sources: [],
      },
      {
        id: "b",
        text: "Oswald shot Kennedy in Dallas Texas.",
        status: "approved",
        disputed: false,
        sources: ["https://www.archives.gov/"],
      },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].survivorId).toBe("b");
    expect(plans[0].deleteIds).toEqual(["a"]);
  });
});

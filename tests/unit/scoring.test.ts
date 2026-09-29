import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS, scoreTheory, xpForScore } from "@/lib/fictional/scoring";

const rubric = {
  culpritSuspectId: "suspect-correct",
  keyEvidenceCodes: ["E1", "E3"],
  motiveKeywords: ["debt", "inheritance"],
  timelineKeywords: ["midnight", "11:47"],
  reasoningKeywords: ["window", "coat"],
};

describe("scoreTheory", () => {
  it("awards full suspect points for correct culprit", () => {
    const score = scoreTheory(
      {
        suspectId: "suspect-correct",
        motive: "debt and inheritance pressure",
        timeline: "around midnight near 11:47",
        evidenceInterpretation: "E1 and E3 match the study",
        reasoning: "window entry and coat fiber",
      },
      rubric,
    );
    expect(score.suspect).toBe(SCORE_WEIGHTS.suspect);
    expect(score.total).toBeGreaterThanOrEqual(70);
  });

  it("zeros suspect points for wrong culprit", () => {
    const score = scoreTheory(
      {
        suspectId: "suspect-wrong",
        motive: "unrelated",
        timeline: "noon",
        evidenceInterpretation: "none",
        reasoning: "guess",
      },
      rubric,
    );
    expect(score.suspect).toBe(0);
    expect(score.total).toBeLessThan(40);
  });
});

describe("xpForScore", () => {
  it("maps score bands to XP", () => {
    expect(xpForScore(95)).toBe(150);
    expect(xpForScore(75)).toBe(100);
    expect(xpForScore(55)).toBe(60);
    expect(xpForScore(35)).toBe(30);
    expect(xpForScore(10)).toBe(15);
  });
});

import { describe, expect, it } from "vitest";
import { resolveAccusation } from "@/lib/investigation/accusation";
import {
  formatAlibiReply,
  formatBackgroundReply,
  fuzzyMatchSuspect,
  parseAgentCommand,
} from "@/lib/investigation/agent-commands";
import { SAMPLE_INVESTIGATION_CASES } from "@/lib/investigation/sample-cases";
import { validateInvestigationCase } from "@/lib/investigation/validate";

describe("validateInvestigationCase", () => {
  it("accepts all sample cases", () => {
    for (const sample of SAMPLE_INVESTIGATION_CASES) {
      const result = validateInvestigationCase(sample);
      expect(result.ok, sample.slug).toBe(true);
      if (result.ok) {
        const guilty = sample.suspects.filter((s) => s.isGuilty);
        expect(guilty).toHaveLength(1);
        expect(result.guiltyId).toBe(guilty[0]!.id);
      }
    }
  });

  it("rejects zero or multiple guilty suspects", () => {
    const base = structuredClone(SAMPLE_INVESTIGATION_CASES[0]!);
    base.suspects.forEach((s) => {
      s.isGuilty = false;
    });
    expect(validateInvestigationCase(base).ok).toBe(false);

    base.suspects[0]!.isGuilty = true;
    base.suspects[1]!.isGuilty = true;
    expect(validateInvestigationCase(base).ok).toBe(false);
  });

  it("rejects missing motive/alibi", () => {
    const base = structuredClone(SAMPLE_INVESTIGATION_CASES[0]!);
    base.suspects[0]!.motive = "";
    base.suspects[1]!.alibi = "";
    const result = validateInvestigationCase(base);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.code === "motive")).toBe(true);
      expect(result.issues.some((i) => i.code === "alibi")).toBe(true);
    }
  });
});

describe("resolveAccusation", () => {
  const draft = SAMPLE_INVESTIGATION_CASES[0]!;
  const guilty = draft.suspects.find((s) => s.isGuilty)!;
  const innocent = draft.suspects.find((s) => !s.isGuilty)!;

  it("increments wrong accusations on false arrest", () => {
    const result = resolveAccusation({
      draft,
      accusedSuspectId: innocent.id,
      priorWrongAccusations: 0,
    });
    expect(result.correct).toBe(false);
    if (!result.correct) {
      expect(result.wrongAccusations).toBe(1);
      expect(result.message.toLowerCase()).toContain("false arrest");
    }
  });

  it("closes case on first-try correct accusation", () => {
    const result = resolveAccusation({
      draft,
      accusedSuspectId: guilty.id,
      priorWrongAccusations: 0,
    });
    expect(result.correct).toBe(true);
    if (result.correct) {
      expect(result.status).toBe("solved_first_try");
      expect(result.reveal.culpritId).toBe(guilty.id);
      expect(result.reveal.weaponName).toBe(draft.weapon.name);
    }
  });

  it("marks solved_after_n when prior wrongs exist", () => {
    const result = resolveAccusation({
      draft,
      accusedSuspectId: guilty.id,
      priorWrongAccusations: 2,
    });
    expect(result.correct).toBe(true);
    if (result.correct) {
      expect(result.status).toBe("solved_after_n");
      expect(result.reveal.wrongAccusationCount).toBe(2);
    }
  });
});

describe("parseAgentCommand + fuzzyMatchSuspect", () => {
  const suspects = SAMPLE_INVESTIGATION_CASES[0]!.suspects;

  it("parses background check commands", () => {
    expect(parseAgentCommand("background check on Jonah Reed")).toEqual({
      kind: "background_check",
      suspectQuery: "Jonah Reed",
    });
    expect(parseAgentCommand("bg check for Tamsin")).toEqual({
      kind: "background_check",
      suspectQuery: "Tamsin",
    });
  });

  it("parses verify alibi commands", () => {
    expect(parseAgentCommand("verify alibi of Priya Vale")).toEqual({
      kind: "verify_alibi",
      suspectQuery: "Priya Vale",
    });
  });

  it("fuzzy-matches suspects and formats deterministic replies", () => {
    const match = fuzzyMatchSuspect("reed", suspects);
    expect(match?.name).toBe("Jonah Reed");
    expect(formatBackgroundReply(match!).toLowerCase()).toContain("background");
    expect(formatAlibiReply(match!).toLowerCase()).toContain("claims");
  });

  it("returns unknown for freeform chatter", () => {
    expect(parseAgentCommand("any news from the pier?").kind).toBe("unknown");
  });
});

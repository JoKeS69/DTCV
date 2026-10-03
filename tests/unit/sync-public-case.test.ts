import { describe, expect, it } from "vitest";
import {
  caseCodeForResearch,
  claimsAsPublicNotes,
  countryCodeFromLocation,
  dedupeClaimsForPublish,
  dedupePeopleForPublish,
  isInstructionLeak,
  mapPersonRole,
  mapResearchCaseStatus,
  mapResearchCaseType,
  personPublicNotes,
  resolvePublicLocation,
  sanitizePublicText,
  yearFromResearch,
} from "@/lib/pb-case/sync-public-case";

describe("sync-public-case helpers", () => {
  it("maps research person roles onto CasePersonRole", () => {
    expect(mapPersonRole("victim")).toBe("VICTIM");
    expect(mapPersonRole("Person of Interest")).toBe("PERSON_OF_INTEREST");
    expect(mapPersonRole("poi")).toBe("PERSON_OF_INTEREST");
    expect(mapPersonRole("subject")).toBe("PERSON_OF_INTEREST");
    expect(mapPersonRole("hijacker", "deceased")).toBe("PERSON_OF_INTEREST");
    expect(mapPersonRole("witness")).toBe("WITNESS");
    expect(mapPersonRole("relative")).toBe("RELATIVE");
    expect(mapPersonRole("journalist")).toBe("OTHER");
    expect(mapPersonRole("President", "deceased")).toBe("VICTIM");
    expect(mapPersonRole("alleged assassin", "deceased")).toBe(
      "PERSON_OF_INTEREST",
    );
  });

  it("does not treat 9/11 attackers as victims when deceased", () => {
    expect(mapPersonRole("subject", "deceased")).toBe("PERSON_OF_INTEREST");
    expect(mapPersonRole("organizer", "deceased")).toBe("PERSON_OF_INTEREST");
    const notes = personPublicNotes({
      role: "subject",
      legalStatus: "deceased",
      presumptionNote: "",
    });
    expect(notes).toMatch(/not a victim/i);
    expect(notes).not.toMatch(/presumed innocent/i);
  });
  it("does not attach presumption boilerplate to deceased victims", () => {
    const notes = personPublicNotes({
      role: "victim",
      legalStatus: "deceased",
      presumptionNote:
        "Presumed innocent unless proven guilty in a court of law.",
    });
    expect(notes).toContain("Legal status: deceased");
    expect(notes).not.toMatch(/presumed innocent/i);
  });

  it("keeps presumption for living persons of interest", () => {
    const notes = personPublicNotes({
      role: "person of interest",
      legalStatus: "person_of_interest",
      presumptionNote: "",
    });
    expect(notes).toMatch(/presumed innocent/i);
  });

  it("derives year from eventDate, eventDateText, or title/summary", () => {
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
      yearFromResearch({
        eventDate: null,
        eventDateText: null,
        title: "JFK assassination",
        summary: "On 22 November 1963 in Dallas, Texas…",
      }),
    ).toBe(1963);
    expect(
      yearFromResearch({ eventDate: null, eventDateText: "unknown" }),
    ).toBeNull();
  });

  it("maps JFK-style research signals to CLOSED + HOMICIDE", () => {
    expect(
      mapResearchCaseStatus({
        labels: [],
        summary:
          "The Warren Commission officially concluded that Lee Harvey Oswald acted alone.",
        title: "JFK assassination",
        people: [{ legalStatus: "deceased", role: "victim" }],
      }),
    ).toBe("CLOSED");
    expect(
      mapResearchCaseType({
        title: "JFK assassination",
        summary: "President Kennedy was killed in Dallas.",
        labels: [],
      }),
    ).toBe("HOMICIDE");
  });

  it("respects explicit cold/unsolved labels", () => {
    expect(
      mapResearchCaseStatus({
        labels: ["cold_case"],
        summary: "Still under review.",
      }),
    ).toBe("COLD");
    expect(
      mapResearchCaseStatus({
        labels: ["unsolved"],
        summary: "No arrests.",
      }),
    ).toBe("UNSOLVED");
  });

  it("resolves geographic location and drops title-as-location", () => {
    expect(
      resolvePublicLocation({
        location: "kennedy assasination",
        title: "kennedy assasination",
        summary: "The shooting occurred in Dallas, Texas on 22 November 1963.",
      }),
    ).toBe("Dallas, Texas");
    expect(
      resolvePublicLocation({
        location: "Dallas, Texas",
        title: "JFK assassination",
        summary: "",
      }),
    ).toBe("Dallas, Texas");
    expect(countryCodeFromLocation("Dallas, Texas")).toBe("US");
  });

  it("strips instruction leakage from public notes and claims", () => {
    expect(
      isInstructionLeak(
        "Disputed claims must appear in a clearly labeled Disputed section and must not be presented as fact.",
      ),
    ).toBe(true);
    expect(
      sanitizePublicText(
        "Oswald fired from the sixth floor. Disputed claims must appear in a clearly labeled Disputed section and must not be presented as fact.",
      ),
    ).toBe("Oswald fired from the sixth floor.");

    const notes = claimsAsPublicNotes(
      [{ text: "Official reports name a lone gunman." }],
      [
        {
          text: "Disputed claims must appear in a clearly labeled Disputed section and must not be presented as fact.",
        },
        { text: "Some researchers allege a second shooter." },
      ],
    );
    expect(notes).toContain("Claims (reported):");
    expect(notes).toContain("Disputed:");
    expect(notes).toContain("Some researchers allege a second shooter.");
    expect(notes).not.toMatch(/must appear in a clearly labeled/i);
    expect(notes).not.toMatch(/presumed innocent/i);
  });

  it("builds stable PB- case codes from research ids", () => {
    const code = caseCodeForResearch("clxyz0123456789abcdef");
    expect(code.startsWith("PB-")).toBe(true);
    expect(code.length).toBeLessThanOrEqual(64);
  });

  it("dedupes publish claims so the same fact is not CLAIM and DISPUTED", () => {
    const { factual, disputed } = dedupeClaimsForPublish(
      [
        {
          text: "Nearly 3,000 people were killed in the September 11 attacks.",
        },
        {
          text: "Nearly 3,000 people were killed in the September 11 attacks in 2001.",
        },
      ],
      [
        {
          text: "Nearly 3,000 people were killed in the September 11 attacks.",
        },
      ],
    );
    expect(disputed).toHaveLength(1);
    expect(factual).toHaveLength(0);
  });

  it("dedupes publish people by name and prefers subject over victim", () => {
    const people = dedupePeopleForPublish([
      {
        name: "Osama bin Laden",
        role: "victim",
        legalStatus: "deceased",
      },
      {
        name: "Osama Bin Laden",
        role: "subject",
        legalStatus: "deceased",
      },
      {
        name: "Osama bin Laden",
        role: "victim",
        legalStatus: "deceased",
      },
    ]);
    expect(people).toHaveLength(1);
    expect(mapPersonRole(people[0].role, people[0].legalStatus)).toBe(
      "PERSON_OF_INTEREST",
    );
  });
});

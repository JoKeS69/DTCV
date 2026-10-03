import type {
  InvestigationCaseDraft,
  InvestigationSuspect,
  SolutionReveal,
} from "./types";

export type AccusationResult =
  | {
      correct: true;
      status: "solved_first_try" | "solved_after_n";
      reveal: SolutionReveal;
    }
  | {
      correct: false;
      wrongAccusations: number;
      message: string;
    };

export function resolveAccusation(opts: {
  draft: InvestigationCaseDraft;
  accusedSuspectId: string;
  priorWrongAccusations: number;
}): AccusationResult {
  const guilty = opts.draft.suspects.find((s) => s.isGuilty);
  if (!guilty) {
    return {
      correct: false,
      wrongAccusations: opts.priorWrongAccusations,
      message: "Case data incomplete — cannot process accusation.",
    };
  }

  if (opts.accusedSuspectId !== guilty.id) {
    const wrong = opts.priorWrongAccusations + 1;
    return {
      correct: false,
      wrongAccusations: wrong,
      message:
        "False arrest — internal review flagged. The case stays open. Recheck dossiers, scenes, and board strings before accusing again.",
    };
  }

  const wrong = opts.priorWrongAccusations;
  const status = wrong === 0 ? "solved_first_try" : "solved_after_n";
  return {
    correct: true,
    status,
    reveal: buildSolutionReveal(opts.draft, guilty, wrong),
  };
}

export function buildSolutionReveal(
  draft: InvestigationCaseDraft,
  guilty: InvestigationSuspect,
  wrongAccusationCount: number,
): SolutionReveal {
  return {
    culpritId: guilty.id,
    culpritName: guilty.name,
    motive: guilty.motive,
    how: guilty.evidenceDetail,
    weaponName: draft.weapon.name,
    weaponTrait: draft.weapon.trait,
    disprovenAlibi: guilty.alibi,
    supportingEvidence: [
      {
        title: guilty.evidenceTitle,
        detail: guilty.evidenceDetail,
      },
      ...draft.locations.slice(0, 3).map((l) => ({
        title: `Scene: ${l.name}`,
        detail: l.clue,
      })),
    ],
    wrongAccusationCount,
    twistNote: draft.hasTwist ? draft.twistNote ?? null : null,
  };
}

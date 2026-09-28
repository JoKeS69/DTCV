/**
 * SERVER-ONLY scoring for fictional theory submissions.
 * Never import this module from Client Components.
 */

export const SCORE_WEIGHTS = {
  suspect: 40,
  motive: 20,
  timeline: 15,
  evidence: 15,
  reasoning: 10,
} as const;

export type ScoreBreakdown = {
  total: number;
  suspect: number;
  motive: number;
  timeline: number;
  evidence: number;
  reasoning: number;
};

export type SolutionRubric = {
  culpritSuspectId: string;
  keyEvidenceCodes: string[];
  motiveKeywords: string[];
  timelineKeywords: string[];
  reasoningKeywords: string[];
};

export type TheoryInput = {
  suspectId: string;
  motive: string;
  timeline: string;
  evidenceInterpretation: string;
  reasoning: string;
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Fraction of unique keywords found in text (0–1). */
function keywordHitRate(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const haystack = normalize(text);
  const hits = new Set<string>();
  for (const raw of keywords) {
    const kw = normalize(raw);
    if (kw && haystack.includes(kw)) hits.add(kw);
  }
  return hits.size / keywords.length;
}

function scoreBand(max: number, rate: number): number {
  if (rate <= 0) return 0;
  if (rate < 0.25) return Math.round(max * 0.25);
  if (rate < 0.5) return Math.round(max * 0.5);
  if (rate < 0.75) return Math.round(max * 0.75);
  return max;
}

export function scoreTheory(
  input: TheoryInput,
  rubric: SolutionRubric,
): ScoreBreakdown {
  const suspect =
    input.suspectId === rubric.culpritSuspectId ? SCORE_WEIGHTS.suspect : 0;

  const motive = scoreBand(
    SCORE_WEIGHTS.motive,
    keywordHitRate(input.motive, rubric.motiveKeywords),
  );

  const timeline = scoreBand(
    SCORE_WEIGHTS.timeline,
    keywordHitRate(input.timeline, rubric.timelineKeywords),
  );

  const evidenceText = normalize(input.evidenceInterpretation);
  const evidenceHits = rubric.keyEvidenceCodes.filter((code) =>
    evidenceText.includes(normalize(code)),
  ).length;
  const evidenceRate =
    rubric.keyEvidenceCodes.length === 0
      ? 0
      : evidenceHits / rubric.keyEvidenceCodes.length;
  const evidence = scoreBand(SCORE_WEIGHTS.evidence, evidenceRate);

  const reasoning = scoreBand(
    SCORE_WEIGHTS.reasoning,
    keywordHitRate(input.reasoning, rubric.reasoningKeywords),
  );

  const total = suspect + motive + timeline + evidence + reasoning;

  return { total, suspect, motive, timeline, evidence, reasoning };
}

/** Minimal XP from fictional completion — full profile UI is Phase 7. */
export function xpForScore(total: number): number {
  if (total >= 90) return 150;
  if (total >= 70) return 100;
  if (total >= 50) return 60;
  if (total >= 30) return 30;
  return 15;
}

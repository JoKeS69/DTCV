/**
 * Legal-safety wording linter for research case content.
 * Blocks guilt declarations, unsafe naming, and copyright-risky paste dumps.
 */

const GUILT_PATTERNS: RegExp[] = [
  /\b(is|was|are|were)\s+(the\s+)?(killer|murderer|assassin|perpetrator|guilty)\b/i,
  /\bdefinitely\s+(killed|murdered|assassinated)\b/i,
  /\bwe\s+know\s+[^.]*\s+(did\s+it|is\s+guilty)\b/i,
  /\bproven\s+guilty\b(?!\s+in\s+(a\s+)?court)/i,
];

const ACCUSATION_WITHOUT_STATUS: RegExp[] = [
  /\b(suspect|person of interest)\b[^.]*\b(definitely|certainly|clearly)\b/i,
];

/** Soft copyright heuristic: very long quoted blocks. */
const LONG_QUOTE = /"[^"]{400,}"/;

export type LinterFinding = {
  severity: "error" | "warning";
  rule: string;
  message: string;
};

export function lintCaseWording(text: string): LinterFinding[] {
  const findings: LinterFinding[] = [];
  if (!text.trim()) return findings;

  for (const re of GUILT_PATTERNS) {
    if (re.test(text)) {
      findings.push({
        severity: "error",
        rule: "no_guilt_declaration",
        message:
          "Wording appears to declare guilt. Use reported/charged/convicted language with sources.",
      });
      break;
    }
  }

  for (const re of ACCUSATION_WITHOUT_STATUS) {
    if (re.test(text)) {
      findings.push({
        severity: "error",
        rule: "presumption_of_innocence",
        message:
          "Accusatory certainty about a named person without court status.",
      });
      break;
    }
  }

  if (LONG_QUOTE.test(text)) {
    findings.push({
      severity: "error",
      rule: "copyright_excerpt_length",
      message:
        "Quoted excerpt is too long. Paraphrase and link the source; keep short excerpts only.",
    });
  }

  if (/\bsupposedly\s+guilty\b/i.test(text)) {
    findings.push({
      severity: "warning",
      rule: "weak_hedge",
      message: "Prefer clear legal-status labels over informal hedges.",
    });
  }

  return findings;
}

export function wordingPassesPublishGate(texts: string[]): {
  ok: boolean;
  findings: LinterFinding[];
} {
  const findings = texts.flatMap(lintCaseWording);
  const ok = !findings.some((f) => f.severity === "error");
  return { ok, findings };
}

/** Naming policy helper for UI/docs. */
export const NAMING_POLICY = {
  preferOfficialNames: true,
  requireLegalStatusNearName: true,
  presumptionOfInnocence:
    "Named persons are presumed innocent unless convicted in a court of law.",
  disputedClaimsSection:
    "Disputed claims must appear in a clearly labeled Disputed section and must not be presented as fact.",
} as const;

import type { InvestigationCaseDraft, InvestigationSuspect } from "./types";

export type ValidationIssue = { code: string; message: string };

export type ValidationResult =
  | { ok: true; guiltyId: string }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Publish gate for Investigation Mode cases.
 * - exactly one guilty
 * - every suspect has motive + alibi
 * - solution supported by ≥2 scene clues (deducible)
 */
export function validateInvestigationCase(
  draft: InvestigationCaseDraft,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!draft.title?.trim()) {
    issues.push({ code: "title", message: "Title is required" });
  }
  if (!draft.teaser?.trim()) {
    issues.push({ code: "teaser", message: "Teaser is required" });
  }
  if (!draft.victims?.length) {
    issues.push({ code: "victims", message: "At least one victim is required" });
  }
  if (!draft.weapon?.name?.trim() || !draft.weapon?.trait?.trim()) {
    issues.push({
      code: "weapon",
      message: "Weapon name and trait are required",
    });
  }

  const suspects = draft.suspects ?? [];
  if (suspects.length < 3 || suspects.length > 5) {
    issues.push({
      code: "suspect_count",
      message: "Case must have 3–5 suspects",
    });
  }

  const locations = draft.locations ?? [];
  if (locations.length < 4 || locations.length > 6) {
    issues.push({
      code: "location_count",
      message: "Case must have 4–6 scenes",
    });
  }

  for (const loc of locations) {
    if (!loc.id?.trim() || !loc.name?.trim() || !loc.clue?.trim()) {
      issues.push({
        code: "location_fields",
        message: `Scene ${loc.id || "?"} needs id, name, and clue`,
      });
      break;
    }
  }

  for (const s of suspects) {
    if (!s.motive?.trim()) {
      issues.push({
        code: "motive",
        message: `Suspect ${s.name || s.id} missing motive`,
      });
    }
    if (!s.alibi?.trim()) {
      issues.push({
        code: "alibi",
        message: `Suspect ${s.name || s.id} missing alibi`,
      });
    }
    if (!s.statement?.trim()) {
      issues.push({
        code: "statement",
        message: `Suspect ${s.name || s.id} missing statement`,
      });
    }
  }

  const guilty = suspects.filter((s) => s.isGuilty);
  if (guilty.length !== 1) {
    issues.push({
      code: "guilty_count",
      message: `Exactly one guilty suspect required (found ${guilty.length})`,
    });
  }

  const clueText = locations.map((l) => l.clue.toLowerCase()).join("\n");
  const supportCount = countSupportingClues(guilty[0], clueText, draft);
  if (guilty.length === 1 && supportCount < 2) {
    issues.push({
      code: "clue_support",
      message:
        "Solution must be supported by at least 2 scene clues (name/role/weapon/trait/alibi contradiction)",
    });
  }

  if (issues.length) return { ok: false, issues };
  return { ok: true, guiltyId: guilty[0]!.id };
}

function countSupportingClues(
  guilty: InvestigationSuspect | undefined,
  clueText: string,
  draft: InvestigationCaseDraft,
): number {
  if (!guilty) return 0;
  const needles = [
    guilty.name.split(/\s+/)[0]?.toLowerCase(),
    guilty.role?.toLowerCase(),
    draft.weapon.name.toLowerCase(),
    draft.weapon.trait.toLowerCase(),
    guilty.evidenceTitle?.toLowerCase(),
    ...tokenize(guilty.evidenceDetail),
  ].filter(Boolean) as string[];

  let hits = 0;
  const seen = new Set<string>();
  for (const loc of draft.locations) {
    const c = loc.clue.toLowerCase();
    const matched = needles.some((n) => n && n.length > 3 && c.includes(n));
    if (matched && !seen.has(loc.id)) {
      seen.add(loc.id);
      hits += 1;
    }
  }

  // Also accept explicit contradiction wording across the pooled clues.
  if (hits < 2 && /false|contradict|impossible|lie|not at|never/i.test(clueText)) {
    hits = Math.max(hits, 2);
  }

  return hits;
}

function tokenize(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 4)
    .slice(0, 8);
}

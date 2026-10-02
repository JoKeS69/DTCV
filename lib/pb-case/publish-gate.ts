import { getCasesPrisma } from "@/lib/cases-db";
import { wordingPassesPublishGate } from "@/lib/pb-case/wording-linter";

export type PublishGateResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Publish requires: admin action (caller-enforced) + all showOnPublish claims approved
 * + wording linter clean + content warning acknowledged at UI layer.
 */
export async function evaluatePublishGate(
  caseId: string,
): Promise<PublishGateResult> {
  const db = getCasesPrisma();
  const caseFile = await db.caseFile.findUnique({
    where: { id: caseId },
    include: {
      claims: true,
      people: true,
    },
  });

  if (!caseFile) {
    return { ok: false, errors: ["Case not found"] };
  }

  const errors: string[] = [];

  const shownClaims = caseFile.claims.filter((c) => c.showOnPublish);
  const unapproved = shownClaims.filter((c) => c.status !== "approved");
  if (unapproved.length > 0) {
    errors.push(
      `${unapproved.length} claim(s) marked for publish are not approved.`,
    );
  }

  const disputedShown = shownClaims.filter(
    (c) => c.disputed || c.status === "disputed",
  );
  // Disputed claims may publish only if labeled disputed (status disputed or disputed flag)
  // and are approved as "disputed content" — treat disputed status as needing explicit approval path.
  for (const c of disputedShown) {
    if (c.status !== "approved" && c.status !== "disputed") {
      errors.push(`Disputed claim ${c.id} is not in an allowed review state.`);
    }
  }

  const pendingPeople = caseFile.people.filter((p) => p.status === "pending");
  if (pendingPeople.length > 0) {
    errors.push(
      `${pendingPeople.length} person record(s) still pending review.`,
    );
  }

  const texts = [
    caseFile.title,
    caseFile.summary,
    ...caseFile.claims.map((c) => c.text),
    typeof caseFile.draftContent === "string"
      ? caseFile.draftContent
      : JSON.stringify(caseFile.draftContent ?? ""),
  ];
  const lint = wordingPassesPublishGate(texts);
  if (!lint.ok) {
    errors.push(
      ...lint.findings
        .filter((f) => f.severity === "error")
        .map((f) => f.message),
    );
  }

  if (!caseFile.sources || (Array.isArray(caseFile.sources) && caseFile.sources.length === 0)) {
    errors.push("At least one source is required before publish.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

import { getCasesPrisma } from "@/lib/cases-db";

export const WORLD_DOMINATION_MAX = 3;

export async function countWorldDomination(): Promise<number> {
  return getCasesPrisma().caseFile.count({
    where: { worldDomination: true },
  });
}

/**
 * Homepage shows exactly up to 3 published world_domination cases.
 * Stubs may be unpublished — they occupy WD slots but are not public.
 */
export async function listPublishedWorldDomination() {
  return getCasesPrisma().caseFile.findMany({
    where: {
      worldDomination: true,
      status: "published",
    },
    orderBy: [{ eventDate: "desc" }, { title: "asc" }],
    take: WORLD_DOMINATION_MAX,
  });
}

export async function assertCanEnableWorldDomination(
  caseId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getCasesPrisma();
  const existing = await db.caseFile.findUnique({
    where: { id: caseId },
    select: { worldDomination: true },
  });
  if (existing?.worldDomination) {
    return { ok: true };
  }
  const count = await countWorldDomination();
  if (count >= WORLD_DOMINATION_MAX) {
    return {
      ok: false,
      error: `World Domination is limited to ${WORLD_DOMINATION_MAX} cases.`,
    };
  }
  return { ok: true };
}

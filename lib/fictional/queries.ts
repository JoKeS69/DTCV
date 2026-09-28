import { getPrisma } from "@/lib/db";

/** Public list fields — never includes Solution. */
export async function listPublishedFictionalCases() {
  return getPrisma().fictionalCase.findMany({
    where: { published: true, isFictional: true },
    orderBy: { caseCode: "asc" },
    select: {
      id: true,
      caseCode: true,
      title: true,
      slug: true,
      synopsis: true,
      setting: true,
      difficulty: true,
      estimatedMinutes: true,
      isFictional: true,
      publishedAt: true,
      _count: {
        select: {
          suspects: true,
          evidence: true,
          witnessStatements: true,
        },
      },
    },
  });
}

/**
 * Case detail for investigation UI.
 * Omits Solution and Evidence.isRedHerring (server-only until after submit).
 */
export async function getFictionalCaseBySlug(slug: string) {
  return getPrisma().fictionalCase.findFirst({
    where: { slug, published: true, isFictional: true },
    select: {
      id: true,
      caseCode: true,
      title: true,
      slug: true,
      synopsis: true,
      setting: true,
      difficulty: true,
      estimatedMinutes: true,
      isFictional: true,
      publishedAt: true,
      suspects: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          age: true,
          occupation: true,
          bio: true,
          publicAlibi: true,
        },
      },
      evidence: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          type: true,
          foundLocation: true,
          foundAt: true,
          // isRedHerring intentionally omitted
        },
      },
      events: {
        orderBy: [{ sortOrder: "asc" }, { occurredAt: "asc" }],
        select: {
          id: true,
          occurredAt: true,
          title: true,
          description: true,
        },
      },
      witnessStatements: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          code: true,
          witnessName: true,
          statement: true,
          recordedAt: true,
        },
      },
    },
  });
}

export async function getUserInvestigation(
  userId: string | undefined,
  fictionalCaseId: string,
) {
  if (!userId) return null;
  return getPrisma().investigation.findFirst({
    where: {
      userId,
      fictionalCaseId,
      target: "FICTIONAL_CASE",
    },
    orderBy: { createdAt: "desc" },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      submission: true,
    },
  });
}

/** Post-submit reveal — only call after TheorySubmission exists. */
export async function getSolutionReveal(fictionalCaseId: string) {
  return getPrisma().solution.findUnique({
    where: { fictionalCaseId },
    select: {
      summary: true,
      explanation: true,
      keyEvidenceCodes: true,
      culprit: { select: { code: true, name: true } },
    },
  });
}

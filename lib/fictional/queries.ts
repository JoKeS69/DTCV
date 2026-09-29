import type { Prisma } from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";

export const FICTIONAL_PAGE_SIZE = 12;

export type FictionalListQuery = {
  page?: number;
};

/** Public list fields — never includes Solution. Paginated. */
export async function listPublishedFictionalCases(query: FictionalListQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const take = FICTIONAL_PAGE_SIZE;
  const skip = (page - 1) * take;
  const where: Prisma.FictionalCaseWhereInput = {
    published: true,
    isFictional: true,
  };

  const [total, items] = await Promise.all([
    getPrisma().fictionalCase.count({ where }),
    getPrisma().fictionalCase.findMany({
      where,
      orderBy: { caseCode: "asc" },
      skip,
      take,
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
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
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

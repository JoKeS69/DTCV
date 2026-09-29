import type { CaseStatus, CaseType, Prisma } from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";

export { labelClass, statusClass } from "@/lib/cases/labels";

export const CASE_PAGE_SIZE = 20;

export type CaseListQuery = {
  q?: string;
  type?: CaseType | "ALL";
  status?: CaseStatus | "ALL";
  country?: string;
  year?: string;
  sort?: "updated" | "year" | "code";
  page?: number;
};

export async function listPublishedCases(query: CaseListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const take = CASE_PAGE_SIZE;
  const skip = (page - 1) * take;

  const where: Prisma.CaseWhereInput = {
    published: true,
    // Dev UI fixtures must never appear as public “real” cases.
    isDevStub: false,
  };

  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { caseCode: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
    ];
  }

  if (query.type && query.type !== "ALL") where.type = query.type;
  if (query.status && query.status !== "ALL") where.status = query.status;
  if (query.country?.trim()) {
    where.countryCode = query.country.trim().toUpperCase();
  }
  if (query.year?.trim() && /^\d{4}$/.test(query.year.trim())) {
    where.year = Number(query.year.trim());
  }

  const orderBy: Prisma.CaseOrderByWithRelationInput[] =
    query.sort === "year"
      ? [{ year: "desc" }, { updatedAt: "desc" }]
      : query.sort === "code"
        ? [{ caseCode: "asc" }]
        : [{ updatedAt: "desc" }];

  const [total, items] = await Promise.all([
    getPrisma().case.count({ where }),
    getPrisma().case.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        caseCode: true,
        title: true,
        slug: true,
        summary: true,
        publicNotes: true,
        location: true,
        countryCode: true,
        year: true,
        type: true,
        status: true,
        contentLabel: true,
        isDevStub: true,
        updatedAt: true,
        lastVerifiedAt: true,
        priority: true,
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

export async function getCaseBySlug(slug: string) {
  return getPrisma().case.findFirst({
    where: { slug, published: true, isDevStub: false },
    include: {
      sources: { orderBy: { createdAt: "asc" } },
      events: { orderBy: [{ sortOrder: "asc" }, { occurredAt: "asc" }] },
      persons: { orderBy: { createdAt: "asc" } },
      discussions: {
        where: { status: { not: "HIDDEN" }, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          body: true,
          contentLabel: true,
          status: true,
          createdAt: true,
          author: {
            select: {
              username: true,
              displayName: true,
              detectiveRank: true,
            },
          },
          _count: {
            select: {
              comments: { where: { deletedAt: null } },
              followers: true,
            },
          },
        },
      },
      _count: { select: { followedBy: true, savedBy: true } },
    },
  });
}

export async function getCaseEngagement(userId: string | undefined, caseId: string) {
  if (!userId) return { followed: false, saved: false };
  const [followed, saved] = await Promise.all([
    getPrisma().followedCase.findUnique({
      where: { userId_caseId: { userId, caseId } },
      select: { id: true },
    }),
    getPrisma().savedCase.findUnique({
      where: { userId_caseId: { userId, caseId } },
      select: { id: true },
    }),
  ]);
  return { followed: !!followed, saved: !!saved };
}

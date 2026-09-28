import type { CaseStatus, CaseType, ContentLabel, Prisma } from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";

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
    where: { slug, published: true },
    include: {
      sources: { orderBy: { createdAt: "asc" } },
      events: { orderBy: [{ sortOrder: "asc" }, { occurredAt: "asc" }] },
      persons: { orderBy: { createdAt: "asc" } },
      discussions: {
        where: { status: { not: "HIDDEN" } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          createdAt: true,
          author: { select: { username: true, displayName: true } },
          _count: { select: { comments: true } },
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

export function labelClass(label: ContentLabel): string {
  switch (label) {
    case "VERIFIED":
      return "text-online border-online/40";
    case "REPORTED":
      return "text-amber border-amber/40";
    case "USER_THEORY":
      return "text-text-muted border-border-strong";
    default:
      return "text-text-muted border-border";
  }
}

export function statusClass(status: CaseStatus): string {
  switch (status) {
    case "OPEN":
      return "text-online";
    case "COLD":
      return "text-amber";
    case "UNSOLVED":
      return "text-text-muted";
    case "CLOSED":
      return "text-text";
    default:
      return "text-text-muted";
  }
}

import { unstable_cache } from "next/cache";
import type { HudMapMarker } from "@/lib/cases/hud-types";
import { getPrisma } from "@/lib/db";

export type CaseStatusCounts = {
  total: number;
  OPEN: number;
  COLD: number;
  UNSOLVED: number;
  CLOSED: number;
};

export type TopLocation = { country: string; count: number };

export type ActivityItem = {
  id: string;
  at: Date;
  text: string;
  href?: string;
};

async function loadCaseStats(): Promise<{
  counts: CaseStatusCounts;
  topLocations: TopLocation[];
}> {
  const prisma = getPrisma();
  const [total, byStatus, byCountry] = await Promise.all([
    prisma.case.count({
      where: {
        published: true,
        isDevStub: false,
        isHidden: false,
        OR: [{ adminOverride: null }, { adminOverride: { hide: false } }],
      },
    }),
    prisma.case.groupBy({
      by: ["status"],
      where: {
        published: true,
        isDevStub: false,
        isHidden: false,
        OR: [{ adminOverride: null }, { adminOverride: { hide: false } }],
      },
      _count: { _all: true },
    }),
    prisma.case.groupBy({
      by: ["countryCode"],
      where: {
        published: true,
        isDevStub: false,
        isHidden: false,
        OR: [{ adminOverride: null }, { adminOverride: { hide: false } }],
        countryCode: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { countryCode: "desc" } },
      take: 5,
    }),
  ]);

  const statusMap = Object.fromEntries(
    byStatus.map((s) => [s.status, s._count._all]),
  ) as Record<string, number>;

  return {
    counts: {
      total,
      OPEN: statusMap.OPEN ?? 0,
      COLD: statusMap.COLD ?? 0,
      UNSOLVED: statusMap.UNSOLVED ?? 0,
      CLOSED: statusMap.CLOSED ?? 0,
    },
    topLocations: byCountry.map((c) => ({
      country: c.countryCode ?? "—",
      count: c._count._all,
    })),
  };
}

async function loadRecentActivity(): Promise<ActivityItem[]> {
  const prisma = getPrisma();
  const [cases, comments, discussions] = await Promise.all([
    prisma.case.findMany({
      where: {
        published: true,
        isDevStub: false,
        isHidden: false,
        OR: [{ adminOverride: null }, { adminOverride: { hide: false } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, caseCode: true, slug: true, updatedAt: true, title: true },
    }),
    prisma.comment.findMany({
      where: {
        deletedAt: null,
        discussion: {
          case: {
            published: true,
            isDevStub: false,
            isHidden: false,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        createdAt: true,
        author: { select: { username: true } },
        discussion: {
          select: {
            id: true,
            case: { select: { caseCode: true, slug: true } },
          },
        },
      },
    }),
    prisma.discussion.findMany({
      where: {
        deletedAt: null,
        case: { published: true, isDevStub: false },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        title: true,
        case: { select: { caseCode: true, slug: true } },
      },
    }),
  ]);

  const items: ActivityItem[] = [
    ...cases.map((c) => ({
      id: `case-${c.id}`,
      at: c.updatedAt,
      text: `Case ${c.caseCode} updated`,
      href: `/cases/${c.slug}`,
    })),
    ...comments.map((c) => ({
      id: `cmt-${c.id}`,
      at: c.createdAt,
      text: `Case ${c.discussion.case.caseCode} / Discussion reply from user: ${c.author.username}`,
      href: `/discussions/${c.discussion.id}`,
    })),
    ...discussions.map((d) => ({
      id: `disc-${d.id}`,
      at: d.createdAt,
      text: `Case ${d.case.caseCode} / New discussion: ${d.title}`,
      href: `/discussions/${d.id}`,
    })),
  ];

  return items
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);
}

async function loadMapMarkers(): Promise<HudMapMarker[]> {
  const rows = await getPrisma().case.findMany({
    where: {
      published: true,
      isDevStub: false,
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true,
      caseCode: true,
      slug: true,
      title: true,
      status: true,
      latitude: true,
      longitude: true,
    },
  });

  return rows.flatMap((row) => {
    const lat = row.latitude;
    const lng = row.longitude;
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        caseCode: row.caseCode,
        slug: row.slug,
        title: row.title,
        status: row.status,
        lat,
        lng,
      },
    ];
  });
}

export function getCaseStatsCached() {
  return unstable_cache(loadCaseStats, ["case-stats"], {
    revalidate: 60,
    tags: ["cases-public"],
  })();
}

export function getRecentActivityCached() {
  return unstable_cache(loadRecentActivity, ["case-activity"], {
    revalidate: 30,
    tags: ["cases-public"],
  })();
}

export function getMapMarkersCached() {
  return unstable_cache(loadMapMarkers, ["case-map-markers"], {
    revalidate: 60,
    tags: ["cases-public"],
  })();
}

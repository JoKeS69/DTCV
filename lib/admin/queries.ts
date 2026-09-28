import { getPrisma } from "@/lib/db";

export async function getAdminAnalytics() {
  const prisma = getPrisma();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    usersTotal,
    usersWeek,
    casesPublished,
    fictionalPublished,
    discussionsWeek,
    commentsWeek,
    investigationsActive,
    theoriesSubmitted,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.case.count({ where: { published: true } }),
    prisma.fictionalCase.count({ where: { published: true } }),
    prisma.discussion.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.comment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.investigation.count({ where: { status: "ACTIVE" } }),
    prisma.investigation.count({ where: { status: "SUBMITTED" } }),
  ]);

  return {
    usersTotal,
    usersWeek,
    casesPublished,
    fictionalPublished,
    discussionsWeek,
    commentsWeek,
    investigationsActive,
    theoriesSubmitted,
  };
}

export async function getAdminOverview() {
  const prisma = getPrisma();
  const [
    users,
    suspendedUsers,
    cases,
    publishedCases,
    featuredCases,
    fictional,
    publishedFictional,
    reportsOpen,
    discussions,
    sources,
    subscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.case.count(),
    prisma.case.count({ where: { published: true } }),
    prisma.case.count({ where: { featured: true } }),
    prisma.fictionalCase.count(),
    prisma.fictionalCase.count({ where: { published: true } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.discussion.count({ where: { deletedAt: null } }),
    prisma.caseSource.count(),
    prisma.user.groupBy({
      by: ["subscriptionPlan"],
      _count: { _all: true },
    }),
  ]);

  return {
    users,
    suspendedUsers,
    cases,
    publishedCases,
    featuredCases,
    fictional,
    publishedFictional,
    reportsOpen,
    discussions,
    sources,
    subscriptions: subscriptions.map((s) => ({
      plan: s.subscriptionPlan,
      count: s._count._all,
    })),
  };
}

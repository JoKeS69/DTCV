import { getPrisma } from "@/lib/db";
import { getDetectiveStats } from "@/lib/progression/stats";
import { formatDetectiveBadge, rankLabel, rankProgress } from "@/lib/progression/ranks";

export async function getDetectiveDossier(username: string) {
  const user = await getPrisma().user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      publicId: true,
      detectiveXP: true,
      detectiveRank: true,
      createdAt: true,
      achievements: {
        orderBy: { earnedAt: "desc" },
        select: {
          earnedAt: true,
          achievement: {
            select: {
              code: true,
              title: true,
              description: true,
              xpReward: true,
            },
          },
        },
      },
      investigations: {
        where: { target: "FICTIONAL_CASE" },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          updatedAt: true,
          fictionalCase: {
            select: {
              caseCode: true,
              title: true,
              slug: true,
              difficulty: true,
            },
          },
          submission: {
            select: {
              scoreTotal: true,
              xpAwarded: true,
              createdAt: true,
            },
          },
        },
      },
      _count: {
        select: {
          discussions: { where: { deletedAt: null, status: { not: "HIDDEN" } } },
          comments: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!user) return null;

  const stats = await getDetectiveStats(user.id);
  const progress = rankProgress(user.detectiveXP);
  const catalog = await getPrisma().achievement.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      code: true,
      title: true,
      description: true,
      xpReward: true,
    },
  });
  const earnedCodes = new Set(user.achievements.map((a) => a.achievement.code));

  return {
    ...user,
    badgeLabel: formatDetectiveBadge(user.publicId),
    rankLabel: rankLabel(user.detectiveRank),
    progress,
    stats,
    achievementCatalog: catalog.map((a) => ({
      ...a,
      earned: earnedCodes.has(a.code),
      earnedAt:
        user.achievements.find((ua) => ua.achievement.code === a.code)?.earnedAt ??
        null,
    })),
  };
}

/** Minimal fictional XP leaderboard — controlled challenges only. */
export async function getFictionalLeaderboard(limit = 10) {
  const users = await getPrisma().user.findMany({
    orderBy: [{ detectiveXP: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      username: true,
      displayName: true,
      publicId: true,
      detectiveXP: true,
      detectiveRank: true,
      _count: {
        select: {
          investigations: {
            where: { target: "FICTIONAL_CASE", status: "SUBMITTED" },
          },
        },
      },
    },
  });

  return users.map((u, index) => ({
    rank: index + 1,
    username: u.username,
    displayName: u.displayName,
    badgeLabel: formatDetectiveBadge(u.publicId),
    detectiveXP: u.detectiveXP,
    rankLabel: rankLabel(u.detectiveRank),
    completed: u._count.investigations,
  }));
}

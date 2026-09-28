import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { rankFromXp } from "@/lib/progression/ranks";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Award an achievement if not already earned.
 * Adds achievement.xpReward to detectiveXP (fictional progression only)
 * and syncs detectiveRank.
 */
export async function awardAchievement(
  tx: Tx,
  userId: string,
  code: string,
): Promise<{ awarded: boolean; xpAdded: number }> {
  const achievement = await tx.achievement.findUnique({
    where: { code },
    select: { id: true, xpReward: true },
  });
  if (!achievement) return { awarded: false, xpAdded: 0 };

  const existing = await tx.userAchievement.findUnique({
    where: {
      userId_achievementId: {
        userId,
        achievementId: achievement.id,
      },
    },
    select: { id: true },
  });
  if (existing) return { awarded: false, xpAdded: 0 };

  await tx.userAchievement.create({
    data: { userId, achievementId: achievement.id },
  });

  const xpAdded = achievement.xpReward;
  if (xpAdded > 0) {
    const user = await tx.user.update({
      where: { id: userId },
      data: { detectiveXP: { increment: xpAdded } },
      select: { detectiveXP: true },
    });
    await tx.user.update({
      where: { id: userId },
      data: { detectiveRank: rankFromXp(user.detectiveXP) },
    });
  }

  return { awarded: true, xpAdded };
}

/** Sync rank from current XP total (after score XP increments). */
export async function syncRankFromXp(tx: Tx, userId: string) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { detectiveXP: true },
  });
  const rank = rankFromXp(user.detectiveXP);
  await tx.user.update({
    where: { id: userId },
    data: { detectiveRank: rank },
  });
  return rank;
}

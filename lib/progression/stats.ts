import { getPrisma } from "@/lib/db";

export type DetectiveStats = {
  casesInvestigated: number;
  casesCompleted: number;
  averageScore: number | null;
  evidenceAnalyzed: number;
  streakDays: number;
  totalXpFromTheories: number;
  perfectScores: number;
};

/**
 * Stats derived from fictional investigations only — never real-case accusations.
 */
export async function getDetectiveStats(userId: string): Promise<DetectiveStats> {
  const prisma = getPrisma();

  const investigations = await prisma.investigation.findMany({
    where: { userId, target: "FICTIONAL_CASE" },
    select: {
      id: true,
      status: true,
      fictionalCaseId: true,
      submittedAt: true,
      startedAt: true,
      submission: {
        select: {
          scoreTotal: true,
          scoreEvidence: true,
          xpAwarded: true,
          createdAt: true,
        },
      },
      fictionalCase: {
        select: {
          _count: { select: { evidence: true } },
        },
      },
    },
  });

  const casesInvestigated = investigations.length;
  const completed = investigations.filter((i) => i.status === "SUBMITTED" && i.submission);
  const casesCompleted = completed.length;
  const scores = completed.map((i) => i.submission!.scoreTotal);
  const averageScore =
    scores.length === 0
      ? null
      : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const evidenceAnalyzed = completed.reduce(
    (sum, i) => sum + (i.fictionalCase?._count.evidence ?? 0),
    0,
  );
  const totalXpFromTheories = completed.reduce(
    (sum, i) => sum + (i.submission?.xpAwarded ?? 0),
    0,
  );
  const perfectScores = scores.filter((s) => s >= 100).length;

  const activityDays = new Set<string>();
  for (const inv of investigations) {
    if (inv.startedAt) activityDays.add(inv.startedAt.toISOString().slice(0, 10));
    if (inv.submittedAt) activityDays.add(inv.submittedAt.toISOString().slice(0, 10));
    if (inv.submission?.createdAt) {
      activityDays.add(inv.submission.createdAt.toISOString().slice(0, 10));
    }
  }
  const streakDays = computeStreak(activityDays);

  return {
    casesInvestigated,
    casesCompleted,
    averageScore,
    evidenceAnalyzed,
    streakDays,
    totalXpFromTheories,
    perfectScores,
  };
}

/** Consecutive calendar days ending today or yesterday with activity. */
function computeStreak(daySet: Set<string>): number {
  if (daySet.size === 0) return 0;
  const today = new Date();
  const cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const todayKey = cursor.toISOString().slice(0, 10);
  const yesterday = new Date(cursor);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (!daySet.has(todayKey) && !daySet.has(yesterdayKey)) return 0;

  let streak = 0;
  if (!daySet.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

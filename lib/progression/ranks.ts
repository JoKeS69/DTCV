import type { DetectiveRank } from "@/lib/generated/prisma/client";
import { formatPublicDetectiveId } from "@/lib/identity/public-id";

/**
 * Rank ladder (display names). XP thresholds apply to fictional / challenge XP only.
 * Internal enum keys kept for schema stability.
 */
export const RANK_LADDER = [
  { rank: "NOVICE" as const, label: "Recruit", minXp: 0 },
  { rank: "JUNIOR" as const, label: "Observer", minXp: 100 },
  { rank: "DETECTIVE" as const, label: "Investigator", minXp: 300 },
  { rank: "SENIOR" as const, label: "Detective", minXp: 600 },
  { rank: "ELITE" as const, label: "Senior Detective", minXp: 1000 },
  { rank: "CHIEF" as const, label: "Master Detective", minXp: 1600 },
] as const;

export type RankStep = (typeof RANK_LADDER)[number];

export function rankFromXp(xp: number): DetectiveRank {
  let current: DetectiveRank = "NOVICE";
  for (const step of RANK_LADDER) {
    if (xp >= step.minXp) current = step.rank;
  }
  return current;
}

export function rankLabel(rank: DetectiveRank | string): string {
  const step = RANK_LADDER.find((r) => r.rank === rank);
  return step?.label ?? String(rank);
}

export function rankProgress(xp: number): {
  rank: DetectiveRank;
  label: string;
  minXp: number;
  next: RankStep | null;
  xpIntoRank: number;
  xpForNext: number | null;
  ratio: number;
} {
  const rank = rankFromXp(xp);
  const index = RANK_LADDER.findIndex((r) => r.rank === rank);
  const current = RANK_LADDER[index] ?? RANK_LADDER[0];
  const next = RANK_LADDER[index + 1] ?? null;
  const xpIntoRank = xp - current.minXp;
  const span = next ? next.minXp - current.minXp : 1;
  const ratio = next ? Math.min(1, Math.max(0, xpIntoRank / span)) : 1;
  return {
    rank,
    label: current.label,
    minXp: current.minXp,
    next,
    xpIntoRank,
    xpForNext: next ? next.minXp - xp : null,
    ratio,
  };
}

/** Public badge label — uses opaque DET- id (not sequential badgeNumber). */
export function formatDetectiveBadge(publicIdOrBadge: string | number): string {
  if (typeof publicIdOrBadge === "string") {
    return formatPublicDetectiveId(publicIdOrBadge);
  }
  // Legacy numeric path — do not use for public UI
  return `INTERNAL-${String(publicIdOrBadge).padStart(4, "0")}`;
}

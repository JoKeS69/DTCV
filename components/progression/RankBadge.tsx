import { rankLabel } from "@/lib/progression/ranks";
import type { DetectiveRank } from "@/lib/generated/prisma/client";

export function RankBadge({
  rank,
  className = "",
}: {
  rank: DetectiveRank | string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex border border-cta/40 bg-cta/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text",
        className,
      ].join(" ")}
    >
      {rankLabel(rank)}
    </span>
  );
}

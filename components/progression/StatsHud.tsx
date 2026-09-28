import type { DetectiveStats } from "@/lib/progression/stats";

export function StatsHud({
  stats,
  advanced = true,
}: {
  stats: DetectiveStats;
  /** Investigator Pro unlocks streak + perfect score cells. */
  advanced?: boolean;
}) {
  const cells = [
    { label: "Investigated", value: String(stats.casesInvestigated) },
    { label: "Completed", value: String(stats.casesCompleted) },
    {
      label: "Avg score",
      value: stats.averageScore == null ? "—" : String(stats.averageScore),
    },
    { label: "Evidence", value: String(stats.evidenceAnalyzed) },
    {
      label: "Streak",
      value: advanced ? `${stats.streakDays}d` : "PRO",
    },
    {
      label: "Perfect",
      value: advanced ? String(stats.perfectScores) : "PRO",
    },
  ];

  return (
    <dl className="grid gap-2 sm:grid-cols-3 md:grid-cols-6">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="border border-border/80 bg-bg/40 px-2 py-2 font-mono"
        >
          <dt className="text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {cell.label}
          </dt>
          <dd className="mt-1 text-sm uppercase tracking-[0.08em] text-text">
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

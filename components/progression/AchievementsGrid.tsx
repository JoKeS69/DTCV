export function AchievementsGrid({
  items,
}: {
  items: {
    code: string;
    title: string;
    description: string;
    xpReward: number;
    earned: boolean;
    earnedAt: Date | string | null;
  }[];
}) {
  if (items.length === 0) {
    return (
      <p className="font-mono text-[11px] text-text-dim">No achievements yet.</p>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.code}
          className={[
            "border px-3 py-2",
            item.earned
              ? "border-online/40 bg-online/5"
              : "border-border/80 opacity-60",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">
              {item.title}
            </p>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
              {item.earned ? "Earned" : "Locked"} · +{item.xpReward} XP
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-text-muted normal-case tracking-normal">
            {item.description}
          </p>
          {item.earned && item.earnedAt ? (
            <p className="mt-1 font-mono text-[9px] text-text-dim">
              {new Date(item.earnedAt).toISOString().slice(0, 10)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

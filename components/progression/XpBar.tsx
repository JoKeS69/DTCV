import { rankProgress } from "@/lib/progression/ranks";

export function XpBar({ xp }: { xp: number }) {
  const progress = rankProgress(xp);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
        <span className="text-text-dim">
          {progress.label}
          {progress.next ? ` → ${progress.next.label}` : " · Max rank"}
        </span>
        <span className="text-text">
          {xp} XP
          {progress.xpForNext != null
            ? ` · ${progress.xpForNext} to next`
            : null}
        </span>
      </div>
      <div className="h-2 border border-border bg-bg">
        <div
          className="h-full bg-cta/70 transition-[width] duration-500"
          style={{ width: `${Math.round(progress.ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

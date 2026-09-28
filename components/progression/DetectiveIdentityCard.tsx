import { RankBadge } from "@/components/progression/RankBadge";
import { XpBar } from "@/components/progression/XpBar";
import type { DetectiveRank } from "@/lib/generated/prisma/client";

export function DetectiveIdentityCard({
  badgeLabel,
  displayName,
  username,
  rank,
  xp,
  bio,
}: {
  badgeLabel: string;
  displayName: string;
  username: string;
  rank: DetectiveRank | string;
  xp: number;
  bio?: string | null;
}) {
  return (
    <header className="border border-border bg-surface/70">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.22em] text-cta">
          {badgeLabel}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold uppercase tracking-[0.1em] text-text">
            {displayName}
          </h1>
          <RankBadge rank={rank} />
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-dim">@{username}</p>
      </div>
      <div className="px-4 py-3">
        <XpBar xp={xp} />
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          XP from fictional ops & achievements only — never real-case accusations.
        </p>
        {bio ? (
          <p className="mt-3 font-mono text-[12px] text-text-muted normal-case tracking-normal">
            {bio}
          </p>
        ) : null}
      </div>
    </header>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getFictionalLeaderboard } from "@/lib/progression/queries";

export const metadata: Metadata = {
  title: "Fictional rankings",
};

export default async function FictionalRankingsPage() {
  const board = await getFictionalLeaderboard(15);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href="/fictional" className="hover:text-text">
          ← Training bay
        </Link>
      </p>
      <header className="mt-3 border border-border bg-surface/50 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
          &gt; Controlled challenge board
        </p>
        <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.1em] text-text">
          Fictional rankings
        </h1>
        <p className="mt-2 font-mono text-[11px] text-text-muted normal-case tracking-normal">
          Ordered by fictional / achievement XP only. Real-case discussion does
          not affect competitive rank.
        </p>
      </header>

      <ol className="mt-4 space-y-2">
        {board.map((row) => (
          <li
            key={row.username}
            className="flex flex-wrap items-center justify-between gap-2 border border-border bg-surface/40 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[12px] text-text-dim">
                #{String(row.rank).padStart(2, "0")}
              </span>
              <div>
                <Link
                  href={`/detectives/${row.username}`}
                  className="font-mono text-[11px] uppercase tracking-[0.12em] text-text hover:text-cta"
                >
                  {row.displayName ?? row.username}
                </Link>
                <p className="mt-1 font-mono text-[10px] text-text-dim">
                  {row.badgeLabel} · {row.rankLabel}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] uppercase tracking-[0.14em] text-text">
              <p>{row.detectiveXP} XP</p>
              <p className="text-text-dim">{row.completed} completed</p>
            </div>
          </li>
        ))}
      </ol>

      {board.length === 0 ? (
        <p className="mt-4 font-mono text-[11px] text-text-dim">
          No detectives ranked yet.
        </p>
      ) : null}
    </main>
  );
}

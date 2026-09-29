import type { HudStats } from "@/lib/cases/hud-data";
import { WorldMap } from "@/components/cases/WorldMap";

export function GlobalCases({ stats }: { stats: HudStats }) {
  return (
    <section className="hud-panel flex h-full min-h-[200px] flex-col">
      <header className="hud-panel-title">
        <span className="lg:hidden">&gt; GLOBAL OVERVIEW</span>
        <span className="hidden lg:inline">&gt; GLOBAL CASES</span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 sm:grid-cols-[1.35fr_0.9fr]">
        <div className="relative min-h-[140px] border-b border-border sm:border-b-0 sm:border-r">
          <WorldMap />
          <p className="absolute bottom-1.5 left-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">
            <span>
              <span className="text-online">●</span> Open
            </span>
            <span>
              <span className="text-amber">●</span> Cold
            </span>
            <span>
              <span className="text-unsolved">●</span> Unsolved
            </span>
            <span>
              <span className="text-closed">●</span> Closed
            </span>
          </p>
        </div>
        <div className="px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em]">
          <p className="text-text-dim">Total Cases</p>
          <p className="mt-0.5 text-[22px] font-semibold tracking-normal text-text">
            {stats.total.toLocaleString("en-US")}
          </p>
          <ul className="mt-2 space-y-0.5">
            <li className="flex justify-between text-online">
              <span>Open</span>
              <span>{stats.OPEN}</span>
            </li>
            <li className="flex justify-between text-amber">
              <span>Cold</span>
              <span>{stats.COLD}</span>
            </li>
            <li className="flex justify-between text-unsolved">
              <span>Unsolved</span>
              <span>{stats.UNSOLVED}</span>
            </li>
            <li className="flex justify-between text-closed">
              <span>Closed</span>
              <span>{stats.CLOSED}</span>
            </li>
          </ul>
          <p className="mt-3 text-text-dim">Top Locations</p>
          <ol className="mt-1 space-y-0.5 text-text-muted">
            {stats.topLocations.map((loc, i) => (
              <li key={loc.country} className="flex justify-between">
                <span>
                  {i + 1}. {loc.country}
                </span>
                <span>{loc.count}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

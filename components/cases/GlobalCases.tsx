import type { HudMapMarker, HudStats } from "@/lib/cases/hud-types";
import { WorldMap } from "@/components/cases/WorldMap";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatCard } from "@/components/ui/StatCard";

export function GlobalCases({
  stats,
  markers = [],
}: {
  stats: HudStats;
  markers?: HudMapMarker[];
}) {
  return (
    <Panel className="min-h-[320px]">
      <PanelHeader>
        <span className="xl:hidden">&gt; GLOBAL OVERVIEW</span>
        <span className="hidden xl:inline">&gt; GLOBAL CASES</span>
      </PanelHeader>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[1.35fr_1fr]">
        <div className="relative min-h-[220px] border-b border-border md:min-h-[240px] xl:min-h-[280px] xl:border-b-0 xl:border-r">
          <WorldMap
            markers={markers}
            className="min-h-[220px] md:min-h-[240px] xl:absolute xl:inset-0 xl:min-h-0"
          />
          <p className="pointer-events-none absolute bottom-4 left-4 right-4 z-[500] flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] uppercase tracking-[0.1em] text-text-dim">
            <span>
              <span className="text-online" aria-hidden>
                ●
              </span>{" "}
              Open
            </span>
            <span>
              <span className="text-amber" aria-hidden>
                ●
              </span>{" "}
              Cold
            </span>
            <span>
              <span className="text-unsolved" aria-hidden>
                ●
              </span>{" "}
              Unsolved
            </span>
            <span>
              <span className="text-closed" aria-hidden>
                ●
              </span>{" "}
              Closed
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-5 p-5 md:p-6">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-dim">
              Total Cases
            </p>
            <p className="mt-2 font-mono text-[40px] font-semibold leading-none tracking-normal text-text xl:text-[48px]">
              {stats.total.toLocaleString("en-US")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Open" value={stats.OPEN} tone="online" />
            <StatCard label="Cold" value={stats.COLD} tone="amber" />
            <StatCard label="Unsolved" value={stats.UNSOLVED} tone="unsolved" />
            <StatCard label="Closed" value={stats.CLOSED} tone="closed" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-dim">
              Top Locations
            </p>
            <ol className="mt-3 space-y-2.5 font-mono text-[13px] uppercase tracking-[0.06em] text-text-muted">
              {stats.topLocations.length === 0 ? (
                <li className="text-text-dim normal-case tracking-normal">
                  No locations yet
                </li>
              ) : (
                stats.topLocations.map((loc, i) => (
                  <li key={loc.country} className="flex justify-between gap-4">
                    <span className="min-w-0 truncate">
                      {i + 1}. {loc.country}
                    </span>
                    <span className="shrink-0 tabular-nums text-text">
                      {loc.count}
                    </span>
                  </li>
                ))
              )}
            </ol>
          </div>
        </div>
      </div>
    </Panel>
  );
}

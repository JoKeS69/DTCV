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
    <Panel className="min-h-0 max-h-[280px] xl:max-h-[260px]">
      <PanelHeader className="!py-2 text-[11px]">
        <span className="xl:hidden">&gt; GLOBAL OVERVIEW</span>
        <span className="hidden xl:inline">&gt; GLOBAL CASES</span>
      </PanelHeader>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[1.2fr_1fr]">
        <div className="relative min-h-[120px] border-b border-border md:min-h-[130px] xl:min-h-[150px] xl:border-b-0 xl:border-r">
          <WorldMap
            markers={markers}
            className="min-h-[120px] md:min-h-[130px] xl:absolute xl:inset-0 xl:min-h-0"
          />
          <p className="pointer-events-none absolute bottom-2 left-3 z-[500] flex max-w-[90%] flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-dim">
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
        <div className="flex flex-col gap-2.5 overflow-hidden p-3 md:p-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
              Total Cases
            </p>
            <p className="mt-1 font-mono text-[22px] font-semibold leading-none tracking-normal text-text md:text-[26px]">
              {stats.total.toLocaleString("en-US")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <StatCard label="Open" value={stats.OPEN} tone="online" compact />
            <StatCard label="Cold" value={stats.COLD} tone="amber" compact />
            <StatCard
              label="Unsolved"
              value={stats.UNSOLVED}
              tone="unsolved"
              compact
            />
            <StatCard label="Closed" value={stats.CLOSED} tone="closed" compact />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
              Top Locations
            </p>
            <ol className="mt-1.5 space-y-1 font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted">
              {stats.topLocations.length === 0 ? (
                <li className="text-text-dim normal-case tracking-normal">
                  No locations yet
                </li>
              ) : (
                stats.topLocations.slice(0, 3).map((loc, i) => (
                  <li key={loc.country} className="flex justify-between gap-3">
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

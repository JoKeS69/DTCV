import type { CaseStatusCounts, TopLocation } from "@/lib/cases/dashboard";

export function GlobalCasesPanel({
  counts,
  topLocations,
}: {
  counts: CaseStatusCounts;
  topLocations: TopLocation[];
}) {
  return (
    <section className="flex h-full min-h-[200px] flex-col border border-border bg-bg">
      <header className="border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
        &gt; Global cases
      </header>
      <div className="grid flex-1 grid-cols-1 gap-2 p-2 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="relative min-h-[140px] border border-border/80 bg-[radial-gradient(ellipse_at_center,#141414_0%,#050505_70%)]">
          {/* Stylized world map plane — density match, not decorative card */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 40%, #22c55e 1px, transparent 1.5px), radial-gradient(circle at 48% 35%, #f59e0b 1px, transparent 1.5px), radial-gradient(circle at 72% 42%, #22c55e 1px, transparent 1.5px), radial-gradient(circle at 35% 55%, #9a9a9a 1px, transparent 1.5px), radial-gradient(circle at 60% 50%, #b33a3a 1px, transparent 1.5px), radial-gradient(circle at 78% 58%, #f59e0b 1px, transparent 1.5px)",
              backgroundSize: "100% 100%",
            }}
          />
          <p className="absolute bottom-2 left-2 flex flex-wrap gap-3 font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">
            <span>
              <span className="text-online">●</span> Open
            </span>
            <span>
              <span className="text-amber">●</span> Cold
            </span>
            <span>
              <span className="text-text-muted">●</span> Unsolved
            </span>
            <span>
              <span className="text-text">●</span> Closed
            </span>
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em]">
          <p className="text-text-dim">Total cases</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-normal text-text">
            {counts.total.toLocaleString("en-US")}
          </p>
          <ul className="mt-2 space-y-0.5">
            <li className="flex justify-between text-online">
              <span>Open</span>
              <span>{counts.OPEN}</span>
            </li>
            <li className="flex justify-between text-amber">
              <span>Cold</span>
              <span>{counts.COLD}</span>
            </li>
            <li className="flex justify-between text-text-muted">
              <span>Unsolved</span>
              <span>{counts.UNSOLVED}</span>
            </li>
            <li className="flex justify-between text-text">
              <span>Closed</span>
              <span>{counts.CLOSED}</span>
            </li>
          </ul>
          <p className="mt-3 text-text-dim">Top locations</p>
          <ol className="mt-1 space-y-0.5 text-text-muted">
            {topLocations.length === 0 ? (
              <li>—</li>
            ) : (
              topLocations.map((loc, i) => (
                <li key={loc.country} className="flex justify-between">
                  <span>
                    {i + 1}. {loc.country}
                  </span>
                  <span>{loc.count}</span>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </section>
  );
}

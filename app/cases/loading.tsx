export default function CasesLoading() {
  return (
    <main className="flex h-full min-h-0 flex-col gap-4 p-4 md:gap-5 md:p-5 xl:gap-6 xl:p-6">
      <div className="hud-panel flex min-h-[420px] flex-col">
        <div className="hud-panel-title">&gt; CASE DATABASE</div>
        <div className="flex flex-1 items-center justify-center px-6 py-16 font-mono text-[14px] text-text-dim">
          Loading case database…
        </div>
      </div>
    </main>
  );
}

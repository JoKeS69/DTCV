export default function CasesLoading() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 py-8 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        Loading case database…
      </p>
      <div className="mt-4 h-40 animate-pulse border border-border bg-surface/40" />
    </main>
  );
}

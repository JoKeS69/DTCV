export default function FictionalLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        Loading fictional ops…
      </p>
      <div className="mt-4 h-32 animate-pulse border border-border bg-surface/40" />
    </main>
  );
}

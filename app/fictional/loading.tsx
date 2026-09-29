export default function FictionalLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-8 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        Loading fictional ops…
      </p>
      <div className="mt-4 h-32 animate-pulse border border-border bg-surface/40" />
    </main>
  );
}

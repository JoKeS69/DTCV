/**
 * Phase 0 scaffolding only — full homepage UI is Phase 1.
 * Confirms App Router + brand shell boot without marketing polish.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-text-muted">
        Foundation
      </p>
      <h1
        className="mt-4 text-5xl tracking-tight text-text md:text-6xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        DETECTIVE
      </h1>
      <p className="mt-4 max-w-md text-center text-sm text-text-muted">
        Phase 0 project foundation. Visual system, auth, cases, and product
        surfaces land in later phases.
      </p>
    </main>
  );
}

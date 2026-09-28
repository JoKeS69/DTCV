const steps = [
  {
    index: "01",
    title: "Enter the platform",
    body: "Create a detective identity and open the case database — sourced files, clear labels, and a calm workspace.",
  },
  {
    index: "02",
    title: "Investigate with discipline",
    body: "Read verified material, annotate evidence, and separate reported facts from user theories.",
  },
  {
    index: "03",
    title: "Train and progress",
    body: "Run fictional operations to earn XP and rank. Progression never comes from accusing real people.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t border-border bg-surface scroll-mt-20"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
          &gt; Protocol
        </p>
        <h2 className="mt-3 font-mono text-2xl font-semibold uppercase tracking-[0.08em] text-text md:text-3xl">
          How it works
        </h2>
        <p className="mt-4 max-w-2xl font-sans text-sm text-text-muted md:text-base">
          A serious investigative loop: access, examine, collaborate, and train —
          with safety rails for real-world cases.
        </p>

        <ol className="mt-12 divide-y divide-border border border-border">
          {steps.map((step) => (
            <li
              key={step.index}
              className="grid gap-4 px-4 py-6 md:grid-cols-[5rem_1fr] md:gap-8 md:px-6 md:py-8"
            >
              <span className="font-mono text-sm tracking-[0.2em] text-cta">
                {step.index}
              </span>
              <div>
                <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-text">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-text-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

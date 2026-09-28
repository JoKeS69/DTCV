import Link from "next/link";
import { MapBackdrop } from "@/components/home/MapBackdrop";
import { designTokens } from "@/lib/design-tokens";

export function Hero() {
  return (
    <section className="relative isolate min-h-[calc(100svh-3.5rem)] overflow-hidden md:min-h-[calc(100svh-4rem)]">
      <MapBackdrop />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-6xl flex-col justify-center px-4 py-20 md:min-h-[calc(100svh-4rem)] md:px-6 md:py-24">
        <p className="motion-fade-up font-mono text-[10px] uppercase tracking-[0.32em] text-text-dim">
          {designTokens.tagline}
        </p>

        <h1 className="motion-fade-up motion-fade-up-delay-1 mt-4 font-mono text-[clamp(2.75rem,9vw,6rem)] font-semibold leading-none tracking-[0.18em] text-text">
          {designTokens.brand}
        </h1>

        <p className="motion-fade-up motion-fade-up-delay-2 mt-6 max-w-3xl font-mono text-[clamp(1rem,2.4vw,1.35rem)] font-medium uppercase tracking-[0.12em] text-text">
          Enter the world of investigation
        </p>

        <p className="motion-fade-up motion-fade-up-delay-2 mt-4 max-w-xl font-sans text-base leading-relaxed text-text-muted md:text-lg">
          Source real unsolved cases, train on fictional investigations, and
          collaborate with detectives worldwide — without the noise.
        </p>

        <div className="motion-fade-up motion-fade-up-delay-3 mt-10 flex flex-wrap gap-3">
          <Link
            href="#featured"
            className="inline-flex items-center justify-center border border-cta bg-cta px-6 py-3.5 font-mono text-sm font-medium uppercase tracking-[0.14em] text-cta-text transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--cta)_88%,white)]"
          >
            Enter platform →
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center border border-border-strong bg-transparent px-6 py-3.5 font-mono text-sm font-medium uppercase tracking-[0.14em] text-text transition-colors duration-200 hover:border-text-muted hover:bg-surface-elevated"
          >
            How it works
          </Link>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim md:left-6">
        &gt; Secure connection established
      </div>
    </section>
  );
}

import Link from "next/link";
import { MapBackdrop } from "@/components/home/MapBackdrop";
import { designTokens } from "@/lib/design-tokens";

export function Hero() {
  return (
    <section className="relative isolate min-h-[calc(100svh-3rem)] overflow-hidden border-b border-border">
      <MapBackdrop />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl flex-col justify-center px-4 py-16 md:px-6">
        <p className="motion-fade-up font-mono text-[10px] uppercase tracking-[0.32em] text-text-dim">
          {designTokens.tagline}
        </p>

        <h1 className="motion-fade-up motion-fade-up-delay-1 mt-3 font-mono text-[clamp(2.5rem,8vw,5.5rem)] font-semibold leading-none tracking-[0.2em] text-text">
          {designTokens.brand}
        </h1>

        <p className="motion-fade-up motion-fade-up-delay-2 mt-5 max-w-2xl font-mono text-[clamp(0.95rem,2vw,1.2rem)] font-medium uppercase tracking-[0.14em] text-text">
          Enter the world of investigation
        </p>

        <p className="motion-fade-up motion-fade-up-delay-2 mt-3 max-w-lg font-mono text-xs leading-relaxed tracking-[0.04em] text-text-muted md:text-[13px]">
          Source real unsolved cases, train on fictional investigations, and
          collaborate with detectives worldwide — without the noise.
        </p>

        <div className="motion-fade-up motion-fade-up-delay-3 mt-8 flex flex-wrap gap-2">
          <Link href="/login" className="auth-btn-primary !w-auto px-6">
            Enter platform →
          </Link>
          <Link href="/register" className="auth-btn-ghost !w-auto px-6">
            Sign up
          </Link>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim md:left-4">
        &gt; Secure connection established
      </div>
    </section>
  );
}

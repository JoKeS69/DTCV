import Link from "next/link";
import { MapBackdrop } from "@/components/home/MapBackdrop";
import { designTokens } from "@/lib/design-tokens";

/** Brand-first hero — design-refs login/dashboard cinematic HUD. */
export function Hero() {
  return (
    <section className="relative isolate min-h-[calc(100svh-2.75rem)] overflow-hidden border-b border-border">
      <MapBackdrop />
      <span className="hud-corner hud-corner-tl" aria-hidden />
      <span className="hud-corner hud-corner-tr" aria-hidden />
      <span className="hud-corner hud-corner-bl" aria-hidden />
      <span className="hud-corner hud-corner-br" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2.75rem)] max-w-6xl flex-col justify-center px-4 py-16 md:px-6">
        <p className="motion-fade-up font-mono text-[10px] uppercase tracking-[0.32em] text-text-dim">
          {designTokens.tagline}
        </p>

        <h1 className="motion-fade-up motion-fade-up-delay-1 mt-3 font-mono text-[clamp(2.75rem,9vw,5.75rem)] font-semibold leading-none tracking-[0.22em] text-text">
          {designTokens.brand}
        </h1>

        <p className="motion-fade-up motion-fade-up-delay-2 mt-5 max-w-xl font-mono text-[13px] leading-relaxed tracking-[0.04em] text-text-muted md:text-sm">
          Sourced case files · community discussion · fictional training. No
          guilt declarations. Citations required.
        </p>

        <div className="motion-fade-up motion-fade-up-delay-3 mt-8 flex flex-wrap gap-2">
          <Link href="/cases" className="auth-btn-primary !w-auto px-6">
            Enter platform →
          </Link>
          <Link href="/login" className="auth-btn-ghost !w-auto px-6">
            Login
          </Link>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim md:left-4">
        &gt; Secure connection established
      </div>
    </section>
  );
}

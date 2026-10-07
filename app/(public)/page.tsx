import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthHudChrome } from "@/components/auth/AuthHudChrome";
import { CasenetAtmosphere } from "@/components/layout/CasenetAtmosphere";
import { designTokens } from "@/lib/design-tokens";

/**
 * Guest gate: one branded composition (not a dashboard).
 * Authenticated detectives continue to the cases command deck.
 */
export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/cases");
  }

  return (
    <div className="auth-landing relative min-h-svh overflow-hidden bg-[#050505] text-text">
      <CasenetAtmosphere variant="auth" />
      <AuthHudChrome />
      <main className="relative z-10 flex min-h-svh flex-col items-center justify-center px-5 py-24">
        <div className="auth-hero mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim motion-fade-up">
            Secure terminal · identity required
          </p>
          <h1 className="mt-5 font-display text-[clamp(2.25rem,8vw,4.25rem)] font-semibold uppercase leading-[1.05] tracking-[0.12em] text-text motion-fade-up motion-fade-up-delay-1">
            {designTokens.brand}
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-text-muted motion-fade-up motion-fade-up-delay-1">
            {designTokens.tagline}
          </p>
          <p className="mx-auto mt-6 max-w-md font-mono text-[13px] leading-relaxed text-text-muted normal-case tracking-normal motion-fade-up motion-fade-up-delay-2">
            Investigate published case files, run original fictional operations,
            and clear Investigation Mode — one detective identity at a time.
          </p>
          <div className="auth-hero-actions motion-fade-up motion-fade-up-delay-3">
            <Link href="/register" className="auth-btn-primary w-full">
              Create identity →
            </Link>
            <Link href="/login" className="auth-btn-ghost w-full">
              Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

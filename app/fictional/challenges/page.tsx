import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { UpgradeButton } from "@/components/billing/BillingActions";
import { getUserEntitlements } from "@/lib/payments/entitlements";

export const metadata: Metadata = { title: "Premium challenges" };

export default async function PremiumChallengesPage() {
  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href="/fictional" className="hover:text-text">
          ← Training bay
        </Link>
      </p>
      <header className="mt-3 border border-border bg-surface/50 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
          &gt; Premium challenges · Investigator Pro
        </p>
        <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.1em] text-text">
          Challenge bay
        </h1>
        <p className="mt-2 font-mono text-[11px] text-text-muted normal-case tracking-normal">
          Timed fictional scenarios and advanced scoring lanes. Free core
          training remains on the main fictional list.
        </p>
      </header>

      {entitlements?.isPremium ? (
        <section className="mt-4 border border-border bg-surface/40 px-4 py-4">
          <p className="font-mono text-[11px] text-online uppercase tracking-[0.14em]">
            Clearance verified
          </p>
          <ul className="mt-3 space-y-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
            <li>› Night-shift timeline drill (coming content pack)</li>
            <li>› Multi-suspect elimination ladder</li>
            <li>› Future AI assist slot reserved</li>
          </ul>
        </section>
      ) : (
        <section className="mt-4 border border-border bg-surface/40 px-4 py-4">
          <p className="font-mono text-[11px] text-text uppercase tracking-[0.14em]">
            Investigator Pro required
          </p>
          <p className="mt-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
            Upgrade with Visa to unlock premium challenges and advanced
            training files.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {session?.user ? (
              <UpgradeButton />
            ) : (
              <Link
                href="/login?callbackUrl=/fictional/challenges"
                className="border border-cta/50 bg-cta/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
              >
                Sign in to upgrade
              </Link>
            )}
            <Link
              href="/pricing"
              className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
            >
              View pricing
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

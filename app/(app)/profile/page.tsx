import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction, updateProfileAction } from "@/app/actions/auth";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { AchievementsGrid } from "@/components/progression/AchievementsGrid";
import { DetectiveIdentityCard } from "@/components/progression/DetectiveIdentityCard";
import { InvestigationHistory } from "@/components/progression/InvestigationHistory";
import { StatsHud } from "@/components/progression/StatsHud";
import { getDetectiveDossier } from "@/lib/progression/queries";
import { getUserEntitlements } from "@/lib/payments/entitlements";
import { requireActiveUser } from "@/lib/server/authz";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Profile");

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.username) redirect("/login?callbackUrl=/profile");

  const gate = await requireActiveUser();
  if (!gate.ok) redirect("/login?callbackUrl=/profile");

  const dossier = await getDetectiveDossier(session.user.username);
  if (!dossier) redirect("/login?callbackUrl=/profile");
  const entitlements = session.user.id
    ? await getUserEntitlements(session.user.id)
    : null;
  const ownerEmail = gate.user.email;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8 xl:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Investigator terminal
        </p>
        <p className="font-mono text-[12px] text-text-dim">
          <Link
            href={`/detectives/${dossier.username}`}
            className="text-cta hover:underline"
          >
            /detectives/{dossier.username}
          </Link>
          <span className="mx-2 text-border-strong">·</span>
          <Link href="/fictional/rankings" className="text-cta hover:underline">
            Rankings
          </Link>
          <span className="mx-2 text-border-strong">·</span>
          <Link href="/billing" className="text-cta hover:underline">
            Billing
          </Link>
          <span className="mx-2 text-border-strong">·</span>
          <Link href="/pricing" className="text-cta hover:underline">
            Pricing
          </Link>
        </p>
      </div>

      <div className="mt-6">
        <DetectiveIdentityCard
          badgeLabel={dossier.badgeLabel}
          displayName={dossier.displayName ?? dossier.username}
          username={dossier.username}
          rank={dossier.detectiveRank}
          xp={dossier.detectiveXP}
          bio={dossier.bio}
        />
      </div>

      <section className="mt-6 border border-border bg-surface/40">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-dim">
          &gt; Clearance · {entitlements?.label ?? "Free"}
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 font-mono text-[13px]">
          <p className="text-text-muted normal-case tracking-normal">
            {entitlements?.isPremium
              ? "Investigator Pro active"
              : "Free · upgrade for Pro tools"}
          </p>
          <Link
            href={entitlements?.isPremium ? "/billing" : "/pricing"}
            className="border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-text"
          >
            {entitlements?.isPremium ? "Manage" : "Upgrade"}
          </Link>
        </div>
      </section>

      <section className="mt-6 border border-border bg-surface/40">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-dim">
          &gt; Statistics
          {entitlements?.isPremium ? " · advanced" : " · core"}
        </header>
        <div className="px-5 py-4">
          <StatsHud
            stats={dossier.stats}
            advanced={!!entitlements?.isPremium}
          />
          {!entitlements?.isPremium ? (
            <p className="mt-3 font-mono text-[12px] text-text-dim">
              Streak & perfect scores need Pro.{" "}
              <Link href="/pricing" className="text-text hover:underline">
                Pricing
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 border border-border bg-surface/40">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-dim">
          &gt; Achievements
        </header>
        <div className="px-5 py-4">
          <AchievementsGrid items={dossier.achievementCatalog} />
        </div>
      </section>

      <section className="mt-6 border border-border bg-surface/40">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-dim">
          &gt; Investigation history
        </header>
        <div className="px-5 py-4">
          <InvestigationHistory items={dossier.investigations} />
        </div>
      </section>

      <section className="mt-6 border border-border bg-surface">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted">
          Account
        </header>
        <dl className="grid gap-4 px-5 py-5 font-mono text-[13px] uppercase tracking-[0.1em] md:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-text-dim">Email</dt>
            <dd className="mt-1.5 normal-case tracking-normal text-text">
              {ownerEmail ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Email status</dt>
            <dd className="mt-1.5 text-online">
              {session.user.emailVerifiedAt ? "Verified" : "Unverified"}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Joined</dt>
            <dd className="mt-1.5 text-text">
              {dossier.createdAt.toISOString().slice(0, 10)}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Community</dt>
            <dd className="mt-1.5 text-text">
              {dossier._count.discussions} discussions ·{" "}
              {dossier._count.comments} comments
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 border border-border bg-surface">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted">
          Display name
        </header>
        <div className="px-5 py-5">
          <ProfileForm
            action={updateProfileAction}
            defaultDisplayName={dossier.displayName ?? dossier.username}
          />
        </div>
      </section>

      <form action={logoutAction} className="mt-8">
        <button type="submit" className="auth-btn-ghost max-w-xs">
          LOGOUT
        </button>
      </form>
    </main>
  );
}

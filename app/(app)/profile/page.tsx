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

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.username) redirect("/login?callbackUrl=/profile");

  const dossier = await getDetectiveDossier(session.user.username);
  if (!dossier) redirect("/login?callbackUrl=/profile");

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 md:px-6 md:py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
        &gt; Investigator terminal
      </p>
      <p className="mt-2 font-mono text-[11px] text-text-dim">
        Public dossier:{" "}
        <Link
          href={`/detectives/${dossier.username}`}
          className="text-cta hover:underline"
        >
          /detectives/{dossier.username}
        </Link>
        {" · "}
        <Link href="/fictional/rankings" className="text-cta hover:underline">
          Rankings
        </Link>
      </p>

      <div className="mt-4">
        <DetectiveIdentityCard
          badgeLabel={dossier.badgeLabel}
          displayName={dossier.displayName ?? dossier.username}
          username={dossier.username}
          rank={dossier.detectiveRank}
          xp={dossier.detectiveXP}
          bio={dossier.bio}
        />
      </div>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Statistics (fictional ops)
        </header>
        <div className="px-4 py-3">
          <StatsHud stats={dossier.stats} />
        </div>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Achievements
        </header>
        <div className="px-4 py-3">
          <AchievementsGrid items={dossier.achievementCatalog} />
        </div>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Investigation history
        </header>
        <div className="px-4 py-3">
          <InvestigationHistory items={dossier.investigations} />
        </div>
      </section>

      <section className="mt-4 border border-border bg-surface">
        <header className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Account identity
        </header>
        <dl className="grid gap-3 px-4 py-4 font-mono text-xs uppercase tracking-[0.14em] md:grid-cols-2">
          <div>
            <dt className="text-text-dim">Email</dt>
            <dd className="mt-1 normal-case tracking-normal text-text">
              {session.user.email}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Email status</dt>
            <dd className="mt-1 text-online">
              {session.user.emailVerifiedAt
                ? "Verified"
                : "Unverified (placeholder flow)"}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Joined</dt>
            <dd className="mt-1 text-text">
              {dossier.createdAt.toISOString().slice(0, 10)}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Community</dt>
            <dd className="mt-1 text-text">
              {dossier._count.discussions} discussions · {dossier._count.comments}{" "}
              comments
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 border border-border bg-surface">
        <header className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Update display name
        </header>
        <div className="px-4 py-4">
          <ProfileForm
            action={updateProfileAction}
            defaultDisplayName={dossier.displayName ?? dossier.username}
          />
        </div>
      </section>

      <form action={logoutAction} className="mt-6">
        <button type="submit" className="auth-btn-ghost max-w-xs">
          LOGOUT
        </button>
      </form>
    </main>
  );
}

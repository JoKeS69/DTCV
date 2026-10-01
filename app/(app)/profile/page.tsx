import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth";
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

  return (
    <main className="deck-page space-y-6 pb-16 md:pb-20 xl:pb-24">
      <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-text-dim">
        &gt; Investigator terminal
      </p>

      <DetectiveIdentityCard
        badgeLabel={dossier.badgeLabel}
        displayName={dossier.displayName ?? dossier.username}
        username={dossier.username}
        rank={dossier.detectiveRank}
        xp={dossier.detectiveXP}
        bio={dossier.bio}
      />

      <section className="border border-border bg-surface/40">
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

      <section className="border border-border bg-surface/40">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-dim">
          &gt; Achievements
        </header>
        <div className="px-5 py-4">
          <AchievementsGrid items={dossier.achievementCatalog} />
        </div>
      </section>

      <section className="border border-border bg-surface/40">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-dim">
          &gt; Investigation history
        </header>
        <div className="px-5 py-4">
          <InvestigationHistory items={dossier.investigations} />
        </div>
      </section>

      <section className="border border-border bg-surface">
        <header className="border-b border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted">
          Account
        </header>
        <dl className="grid gap-4 px-5 py-5 font-mono text-[13px] uppercase tracking-[0.1em] sm:grid-cols-2">
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

      <div className="deck-actions">
        <form action={logoutAction}>
          <button type="submit" className="deck-btn-sm">
            LOGOUT
          </button>
        </form>
      </div>
    </main>
  );
}

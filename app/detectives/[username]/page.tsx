import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AchievementsGrid } from "@/components/progression/AchievementsGrid";
import { DetectiveIdentityCard } from "@/components/progression/DetectiveIdentityCard";
import { InvestigationHistory } from "@/components/progression/InvestigationHistory";
import { StatsHud } from "@/components/progression/StatsHud";
import { getDetectiveDossier } from "@/lib/progression/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const dossier = await getDetectiveDossier(username);
  if (!dossier) {
    return buildPageMetadata({
      title: "Detective not found",
      path: `/detectives/${username}`,
      noIndex: true,
    });
  }
  // Public dossier only — never include email or private account fields.
  return buildPageMetadata({
    title: `${dossier.displayName ?? dossier.username} · ${dossier.rankLabel}`,
    description: `Public DETECTIVE dossier for @${dossier.username}. Rank ${dossier.rankLabel}. Fictional-ops XP only.`,
    path: `/detectives/${dossier.username}`,
  });
}

export default async function PublicDetectiveProfilePage({ params }: Props) {
  const { username } = await params;
  const dossier = await getDetectiveDossier(username);
  if (!dossier) notFound();

  const earned = dossier.achievementCatalog.filter((a) => a.earned);

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href="/fictional" className="hover:text-text">
          ← Training bay
        </Link>
        {" · Public dossier · "}
        <Link href="/fictional/rankings" className="hover:text-text">
          Rankings
        </Link>
      </p>

      <div className="mt-3">
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
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            Rankings & XP exclude real-case discussion activity.
          </p>
        </div>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Achievements ({earned.length}/{dossier.achievementCatalog.length})
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
    </main>
  );
}

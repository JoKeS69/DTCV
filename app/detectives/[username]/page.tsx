import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentLabelBadge } from "@/components/cases/ContentLabelBadge";
import { getPublicDetectiveProfile } from "@/lib/community/queries";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicDetectiveProfile(username);
  if (!profile) return { title: "Detective not found" };
  return {
    title: `${profile.displayName ?? profile.username} · Detective`,
  };
}

export default async function PublicDetectiveProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getPublicDetectiveProfile(username);
  if (!profile) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href="/cases" className="hover:text-text">
          ← Case database
        </Link>
        {" · Public dossier"}
      </p>

      <header className="mt-3 border border-border bg-surface/70">
        <div className="border-b border-border px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.18em] text-text-dim">
            DETECTIVE PROFILE
          </p>
          <h1 className="mt-1 font-mono text-2xl font-semibold uppercase tracking-[0.1em] text-text">
            {profile.displayName ?? profile.username}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-text-dim">
            @{profile.username} · {profile.detectiveRank} · {profile.detectiveXP}{" "}
            XP
          </p>
        </div>
        <dl className="grid gap-3 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] sm:grid-cols-3">
          <div>
            <dt className="text-text-dim">Discussions</dt>
            <dd className="mt-1 text-text">{profile._count.discussions}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Comments</dt>
            <dd className="mt-1 text-text">{profile._count.comments}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Joined</dt>
            <dd className="mt-1 text-text">
              {profile.createdAt.toISOString().slice(0, 10)}
            </dd>
          </div>
        </dl>
        {profile.bio ? (
          <p className="border-t border-border px-4 py-3 font-mono text-[12px] text-text-muted normal-case tracking-normal">
            {profile.bio}
          </p>
        ) : null}
      </header>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Recent discussions
        </header>
        <div className="px-4 py-3">
          {profile.discussions.length === 0 ? (
            <p className="font-mono text-[11px] text-text-dim">
              No public discussions yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {profile.discussions.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-start justify-between gap-2 border border-border/80 px-3 py-2"
                >
                  <div>
                    <Link
                      href={`/discussions/${d.id}`}
                      className="font-mono text-[11px] uppercase tracking-[0.12em] text-text hover:text-cta"
                    >
                      {d.title}
                    </Link>
                    <p className="mt-1 font-mono text-[10px] text-text-dim">
                      <Link
                        href={`/cases/${d.case.slug}`}
                        className="hover:text-text"
                      >
                        {d.case.caseCode}
                      </Link>
                      {" · "}
                      {d._count.comments} comments
                    </p>
                  </div>
                  <ContentLabelBadge label={d.contentLabel} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

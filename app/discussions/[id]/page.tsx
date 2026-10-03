import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ContentLabelBadge } from "@/components/cases/ContentLabelBadge";
import { CommentThread } from "@/components/community/CommentThread";
import { DiscussionActions } from "@/components/community/DiscussionActions";
import { TheorySafetyBanner } from "@/components/community/TheorySafetyBanner";
import {
  getDiscussionById,
  isFollowingDiscussion,
  listCommentsForDiscussion,
} from "@/lib/community/queries";
import { getPrisma } from "@/lib/db";
import { rankLabel } from "@/lib/progression/ranks";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const discussion = await getDiscussionById(id);
  if (!discussion || !discussion.case.published) {
    return buildPageMetadata({
      title: "Discussion not found",
      path: `/discussions/${id}`,
      noIndex: true,
    });
  }
  // Title + case code only — never dump comment bodies or emails into SEO.
  return buildPageMetadata({
    title: `${discussion.title} · Discussion`,
    description: `Community discussion on ${discussion.case.title}. User theories are labeled; not evidence of guilt.`,
    path: `/discussions/${discussion.id}`,
  });
}

export default async function DiscussionDetailPage({ params }: Props) {
  const { id } = await params;
  const discussion = await getDiscussionById(id);
  if (!discussion || !discussion.case.published) notFound();

  const session = await auth();
  const [comments, followed, dbUser] = await Promise.all([
    listCommentsForDiscussion(discussion.id),
    isFollowingDiscussion(session?.user?.id, discussion.id),
    session?.user?.id
      ? getPrisma().user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        })
      : Promise.resolve(null),
  ]);

  const isStaff =
    dbUser?.role === "ADMIN" || dbUser?.role === "MODERATOR";
  const canModerate =
    isStaff || session?.user?.id === discussion.authorId;

  return (
    <main className="deck-page">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link
          href={`/cases/${discussion.case.slug}`}
          className="hover:text-text"
        >
          ← {discussion.case.title}
        </Link>
        {" · "}
        <Link href="/cases" className="hover:text-text">
          Case database
        </Link>
      </p>

      <header className="mt-3 border border-border bg-surface/70">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-text-dim">
              DISCUSSION
            </p>
            <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.08em] text-text md:text-2xl">
              {discussion.title}
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
              By{" "}
              <Link
                href={`/detectives/${discussion.author.username}`}
                className="text-cta hover:underline"
              >
                {discussion.author.displayName ?? discussion.author.username}
              </Link>
              {" · "}
              {rankLabel(discussion.author.detectiveRank)}
              {discussion.status === "LOCKED" ? " · Locked" : null}
            </p>
          </div>
          <ContentLabelBadge label={discussion.contentLabel} />
        </div>
        <div className="space-y-3 px-4 py-3">
          <TheorySafetyBanner />
          {discussion.body ? (
            <p className="font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal whitespace-pre-wrap">
              {discussion.body}
            </p>
          ) : null}
          <DiscussionActions
            discussionId={discussion.id}
            signedIn={!!session?.user}
            initialFollowed={followed}
            canModerate={canModerate}
          />
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {discussion._count.followers} following this thread
          </p>
        </div>
      </header>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Comments
        </header>
        <div className="px-4 py-3">
          <CommentThread
            discussionId={discussion.id}
            comments={comments}
            signedIn={!!session?.user}
            currentUserId={session?.user?.id}
            locked={discussion.status === "LOCKED"}
          />
        </div>
      </section>
    </main>
  );
}

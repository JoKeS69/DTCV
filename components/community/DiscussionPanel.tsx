import Link from "next/link";
import { ContentLabelBadge } from "@/components/cases/ContentLabelBadge";
import { CreateDiscussionForm } from "@/components/community/CreateDiscussionForm";
import { TheorySafetyBanner } from "@/components/community/TheorySafetyBanner";
import type { ContentLabel, DiscussionStatus } from "@/lib/generated/prisma/client";
import { rankLabel } from "@/lib/progression/ranks";

type DiscussionListItem = {
  id: string;
  title: string;
  body: string | null;
  contentLabel: ContentLabel;
  status: DiscussionStatus;
  createdAt: Date;
  author: {
    username: string;
    displayName: string | null;
    detectiveRank: string;
  };
  _count: { comments: number; followers: number };
};

export function DiscussionPanel({
  caseId,
  caseSlug,
  discussions,
  signedIn,
}: {
  caseId: string;
  caseSlug: string;
  discussions: DiscussionListItem[];
  signedIn: boolean;
}) {
  return (
    <div className="space-y-3" data-testid="case-discussion-body">
      <TheorySafetyBanner />
      <CreateDiscussionForm
        caseId={caseId}
        caseSlug={caseSlug}
        signedIn={signedIn}
      />

      {discussions.length === 0 ? (
        <div
          className="border border-dashed border-border/80 px-3 py-8 text-center"
          data-testid="case-discussion-empty"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
            No discussions on this file yet
          </p>
          <p className="mt-2 font-mono text-[11px] text-text-dim normal-case tracking-normal">
            {signedIn
              ? "Start a thread — posts are labeled User theory."
              : "Sign in to start a thread. Posts are labeled User theory."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/70 border border-border/80">
          {discussions.map((discussion) => (
            <li key={discussion.id} className="px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/discussions/${discussion.id}`}
                    className="font-mono text-[11px] uppercase tracking-[0.12em] text-text hover:text-cta"
                  >
                    {discussion.title}
                  </Link>
                  <p className="mt-1 font-mono text-[10px] text-text-dim">
                    <Link
                      href={`/detectives/${discussion.author.username}`}
                      className="text-cta hover:underline"
                    >
                      {discussion.author.displayName ?? discussion.author.username}
                    </Link>
                    {" · "}
                    {rankLabel(discussion.author.detectiveRank)} ·{" "}
                    {discussion._count.comments} comments ·{" "}
                    {discussion._count.followers} following
                    {discussion.status === "LOCKED" ? " · Locked" : null}
                  </p>
                </div>
                <ContentLabelBadge label={discussion.contentLabel} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

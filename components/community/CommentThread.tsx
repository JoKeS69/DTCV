"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createComment,
  softDeleteComment,
  toggleCommentLike,
} from "@/app/actions/community";
import { ContentLabelBadge } from "@/components/cases/ContentLabelBadge";
import { ReportDialog } from "@/components/community/ReportDialog";
import type { ContentLabel } from "@/lib/generated/prisma/client";
import { rankLabel } from "@/lib/progression/ranks";

type Reaction = { userId: string; type: string };

type CommentNode = {
  id: string;
  authorId: string;
  body: string;
  contentLabel: ContentLabel;
  createdAt: Date | string;
  author: {
    username: string;
    displayName: string | null;
    detectiveRank: string;
  };
  reactions: Reaction[];
  replies?: CommentNode[];
};

export function CommentThread({
  discussionId,
  comments,
  signedIn,
  currentUserId,
  locked,
}: {
  discussionId: string;
  comments: CommentNode[];
  signedIn: boolean;
  currentUserId?: string;
  locked: boolean;
}) {
  const router = useRouter();
  const needAuth = () =>
    router.push(
      `/login?callbackUrl=${encodeURIComponent(`/discussions/${discussionId}`)}`,
    );

  return (
    <div className="space-y-4">
      {!locked ? (
        <CommentForm
          discussionId={discussionId}
          signedIn={signedIn}
          onNeedAuth={needAuth}
        />
      ) : (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
          Discussion locked — new comments disabled.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="font-mono text-[11px] text-text-dim">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentCard
                comment={comment}
                discussionId={discussionId}
                signedIn={signedIn}
                currentUserId={currentUserId}
                locked={locked}
                onNeedAuth={needAuth}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  discussionId,
  signedIn,
  currentUserId,
  locked,
  onNeedAuth,
  isReply = false,
}: {
  comment: CommentNode;
  discussionId: string;
  signedIn: boolean;
  currentUserId?: string;
  locked: boolean;
  onNeedAuth: () => void;
  isReply?: boolean;
}) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const likeCount = comment.reactions.filter((r) => r.type === "LIKE").length;
  const liked = !!currentUserId && comment.reactions.some(
    (r) => r.type === "LIKE" && r.userId === currentUserId,
  );
  const canDelete = !!currentUserId && currentUserId === comment.authorId;

  return (
    <article
      className={[
        "border border-border/80 px-3 py-2",
        isReply ? "ml-4 mt-2 border-l-2 border-l-border-strong" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
          <Link
            href={`/detectives/${comment.author.username}`}
            className="text-cta hover:underline"
          >
            {comment.author.displayName ?? comment.author.username}
          </Link>
          <span className="text-text-dim">
            {" "}
            · {rankLabel(comment.author.detectiveRank)}
          </span>
        </p>
        <ContentLabelBadge label={comment.contentLabel} />
      </div>
      <p className="mt-2 font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal whitespace-pre-wrap">
        {comment.body}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          className={[
            "font-mono text-[9px] uppercase tracking-[0.14em]",
            liked ? "text-online" : "text-text-dim hover:text-text",
          ].join(" ")}
          onClick={() => {
            if (!signedIn) return onNeedAuth();
            startTransition(async () => {
              await toggleCommentLike(comment.id);
              router.refresh();
            });
          }}
        >
          {liked ? "Liked" : "Like"} ({likeCount})
        </button>
        {!isReply && !locked ? (
          <button
            type="button"
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim hover:text-text"
            onClick={() => {
              if (!signedIn) return onNeedAuth();
              setReplyOpen((v) => !v);
            }}
          >
            Reply
          </button>
        ) : null}
        <ReportDialog
          targetType="COMMENT"
          targetId={comment.id}
          signedIn={signedIn}
          onNeedAuth={onNeedAuth}
        />
        {signedIn && canDelete ? (
          <button
            type="button"
            disabled={pending}
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim hover:text-danger"
            onClick={() => {
              startTransition(async () => {
                await softDeleteComment(comment.id);
                router.refresh();
              });
            }}
          >
            Soft-delete
          </button>
        ) : null}
      </div>

      {replyOpen && !locked ? (
        <div className="mt-2">
          <CommentForm
            discussionId={discussionId}
            parentId={comment.id}
            signedIn={signedIn}
            onNeedAuth={onNeedAuth}
            onDone={() => setReplyOpen(false)}
          />
        </div>
      ) : null}

      {comment.replies?.length ? (
        <ul className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentCard
                comment={reply}
                discussionId={discussionId}
                signedIn={signedIn}
                currentUserId={currentUserId}
                locked={locked}
                onNeedAuth={onNeedAuth}
                isReply
              />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function CommentForm({
  discussionId,
  parentId,
  signedIn,
  onNeedAuth,
  onDone,
}: {
  discussionId: string;
  parentId?: string;
  signedIn: boolean;
  onNeedAuth: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <button
        type="button"
        className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted"
        onClick={onNeedAuth}
      >
        Sign in to comment
      </button>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createComment({
            discussionId,
            body,
            parentId,
            contentLabel: "USER_THEORY",
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBody("");
          setError(null);
          onDone?.();
          router.refresh();
        });
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={4000}
        rows={parentId ? 2 : 3}
        placeholder={parentId ? "Write a reply (USER THEORY)…" : "Write a comment (USER THEORY)…"}
        className="w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text normal-case tracking-normal"
      />
      {error ? (
        <p className="font-mono text-[10px] text-danger">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
      >
        {pending ? "Posting…" : parentId ? "Post reply" : "Post comment"}
      </button>
    </form>
  );
}

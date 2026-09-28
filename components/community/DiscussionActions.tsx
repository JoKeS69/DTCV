"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  softDeleteDiscussion,
  toggleFollowDiscussion,
} from "@/app/actions/community";
import { ReportDialog } from "@/components/community/ReportDialog";

export function DiscussionActions({
  discussionId,
  signedIn,
  initialFollowed,
  canModerate,
}: {
  discussionId: string;
  signedIn: boolean;
  initialFollowed: boolean;
  canModerate: boolean;
}) {
  const router = useRouter();
  const [followed, setFollowed] = useState(initialFollowed);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needAuth = () =>
    router.push(
      `/login?callbackUrl=${encodeURIComponent(`/discussions/${discussionId}`)}`,
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:border-border-strong disabled:opacity-50"
        onClick={() => {
          if (!signedIn) return needAuth();
          startTransition(async () => {
            const result = await toggleFollowDiscussion(discussionId);
            if (!result.ok) {
              setMessage(result.error);
              return;
            }
            setFollowed(!!result.followed);
            setMessage(null);
          });
        }}
      >
        {followed ? "Unfollow" : "Follow discussion"}
      </button>

      <ReportDialog
        targetType="DISCUSSION"
        targetId={discussionId}
        signedIn={signedIn}
        onNeedAuth={needAuth}
      />

      {canModerate ? (
        <button
          type="button"
          disabled={pending}
          className="border border-danger/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-danger disabled:opacity-50"
          onClick={() => {
            startTransition(async () => {
              const result = await softDeleteDiscussion(discussionId);
              if (!result.ok) {
                setMessage(result.error);
                return;
              }
              router.push("/cases");
            });
          }}
        >
          Soft-delete
        </button>
      ) : null}

      {message ? (
        <span className="font-mono text-[10px] text-danger">{message}</span>
      ) : null}
    </div>
  );
}

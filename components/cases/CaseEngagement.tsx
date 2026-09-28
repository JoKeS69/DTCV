"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollowCase, toggleSaveCase } from "@/app/actions/cases";

export function CaseEngagement({
  caseId,
  slug,
  initialFollowed,
  initialSaved,
  signedIn,
}: {
  caseId: string;
  slug: string;
  initialFollowed: boolean;
  initialSaved: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [followed, setFollowed] = useState(initialFollowed);
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function requireAuth() {
    router.push(`/login?callbackUrl=${encodeURIComponent(`/cases/${slug}`)}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:border-border-strong disabled:opacity-50"
        onClick={() => {
          if (!signedIn) return requireAuth();
          startTransition(async () => {
            const result = await toggleFollowCase(caseId, slug);
            if (!result.ok) {
              setMessage(result.error ?? "Failed");
              return;
            }
            setFollowed(!!result.followed);
            setMessage(null);
          });
        }}
      >
        {followed ? "Unfollow" : "Follow case"}
      </button>

      <button
        type="button"
        disabled={pending}
        className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:border-border-strong disabled:opacity-50"
        onClick={() => {
          if (!signedIn) return requireAuth();
          startTransition(async () => {
            const result = await toggleSaveCase(caseId, slug);
            if (!result.ok) {
              setMessage(result.error ?? "Failed");
              return;
            }
            setSaved(!!result.saved);
            setMessage(null);
          });
        }}
      >
        {saved ? "Unsave" : "Save case"}
      </button>

      <ShareButton slug={slug} />

      {message ? (
        <span className="font-mono text-[10px] text-danger">{message}</span>
      ) : null}
    </div>
  );
}

function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20"
      onClick={async () => {
        const url = `${window.location.origin}/cases/${slug}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

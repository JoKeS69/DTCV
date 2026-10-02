"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  publishCaseAction,
  reviewClaimAction,
  reviewPersonAction,
  setWorldDominationAction,
  startResearchAction,
  unpublishCaseAction,
  updateLabelsAction,
} from "@/app/actions/pb-case";

export function ResearchButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startResearchAction(caseId);
            setMsg(
              res.ok
                ? `Queued for worker (run ${res.runId}) — monitor status below`
                : res.error,
            );
            router.refresh();
          })
        }
        className="border border-border bg-accent/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-accent/30 disabled:opacity-50"
      >
        {pending ? "Queueing…" : "Run research"}
      </button>
      {msg ? (
        <span className="font-mono text-[11px] text-text-muted">{msg}</span>
      ) : null}
    </div>
  );
}

export function PublishControls({
  caseId,
  status,
}: {
  caseId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "published" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await publishCaseAction(caseId);
              setError(res.ok ? null : res.error);
              router.refresh();
            })
          }
          className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-surface"
        >
          Publish
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await unpublishCaseAction(caseId);
              router.refresh();
            })
          }
          className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-surface"
        >
          Unpublish
        </button>
      )}
      {error ? (
        <p className="w-full font-mono text-[11px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}

export function ClaimReviewButtons({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      {(["approved", "rejected", "disputed", "pending"] as const).map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await reviewClaimAction(claimId, s);
              router.refresh();
            })
          }
          className="border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] hover:bg-surface"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function PersonReviewButtons({ personId }: { personId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      {(["approved", "rejected", "pending"] as const).map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await reviewPersonAction(personId, s);
              router.refresh();
            })
          }
          className="border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] hover:bg-surface"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function WorldDominationToggle({
  caseId,
  enabled,
}: {
  caseId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setWorldDominationAction(caseId, !enabled);
            setError(res.ok ? null : res.error);
            router.refresh();
          })
        }
        className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-surface"
      >
        {enabled ? "Remove World Domination" : "Mark World Domination"}
      </button>
      {error ? (
        <p className="mt-1 font-mono text-[11px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}

export function LabelsForm({
  caseId,
  labels,
}: {
  caseId: string;
  labels: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await updateLabelsAction(
            caseId,
            String(fd.get("labels") || ""),
          );
          setError(res.ok ? null : res.error);
          router.refresh();
        });
      }}
    >
      <input
        name="labels"
        defaultValue={labels.join(", ")}
        className="min-w-[240px] flex-1 border border-border bg-bg px-2 py-1.5 font-mono text-[12px]"
        placeholder="cold_case, world_domination"
      />
      <button
        type="submit"
        disabled={pending}
        className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
      >
        Save labels
      </button>
      {error ? (
        <p className="w-full font-mono text-[11px] text-danger">{error}</p>
      ) : null}
    </form>
  );
}

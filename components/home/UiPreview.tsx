"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { Modal } from "@/components/ui/Modal";

/**
 * Compact interactive proof of shared UI primitives for Phase 1.
 * Not a product feature — removes before denser product surfaces land.
 */
export function UiPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [showError, setShowError] = useState(false);

  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
          &gt; Interface kit
        </p>
        <h2 className="mt-3 font-mono text-lg font-semibold uppercase tracking-[0.12em] text-text">
          Shared controls
        </h2>
        <p className="mt-2 max-w-xl font-sans text-sm text-text-muted">
          Buttons, modal, loading, and error states used across DETECTIVE.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={() => setModalOpen(true)}>Open modal →</Button>
          <Button variant="ghost" onClick={() => setShowError((v) => !v)}>
            Toggle error
          </Button>
          <Loading label="Syncing feed…" />
        </div>

        {showError ? (
          <ErrorState
            className="mt-6 max-w-xl"
            message="Unable to reach case archive. Check your connection and retry."
            onRetry={() => setShowError(false)}
          />
        ) : null}

        <Modal
          open={modalOpen}
          title="Briefing"
          onClose={() => setModalOpen(false)}
        >
          <p className="font-sans leading-relaxed">
            This modal is part of the Phase 1 visual kit. Auth and live case
            data are intentionally not wired yet.
          </p>
        </Modal>
      </div>
    </section>
  );
}

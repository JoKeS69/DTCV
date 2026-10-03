"use client";

import { MessageSquare, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  threadCount: number;
};

/**
 * Case-detail discussion chrome: sticky HUD rail on desktop / large tablets,
 * bottom drawer on small screens. Interaction surface only — content is passed
 * as children (server DiscussionPanel + existing community actions).
 */
export function CaseDiscussionSidePanel({
  children,
  threadCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelId = useId();
  const countLabel = threadCount === 1 ? "1 thread" : `${threadCount} threads`;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close drawer when viewport crosses to desktop rail.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close discussion drawer"
          className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id={panelId}
        data-testid="case-discussion-panel"
        aria-labelledby={titleId}
        className={[
          "hud-panel flex min-h-0 flex-col",
          open
            ? "motion-sheet-in fixed inset-x-0 bottom-0 z-50 max-h-[min(85svh,720px)] rounded-t-[8px] border-t border-border-strong shadow-[0_-12px_40px_rgb(0_0_0_/0.45)]"
            : "hidden",
          "lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100svh-5.5rem)] lg:shadow-none lg:rounded-none",
        ].join(" ")}
      >
        <header className="hud-panel-title shrink-0">
          <span id={titleId} className="min-w-0 truncate">
            &gt; DISCUSSION
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">
              {countLabel}
            </span>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center border border-border text-text-muted transition-colors hover:border-border-strong hover:text-text lg:hidden"
              aria-label="Close discussion"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
          {children}
        </div>
      </aside>

      {!open ? (
        <button
          type="button"
          data-testid="case-discussion-open"
          className="fixed bottom-[calc(var(--bottom-nav)+env(safe-area-inset-bottom)+12px)] right-3 z-30 inline-flex items-center gap-2 border border-border-strong bg-surface-elevated px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text shadow-[0_8px_24px_rgb(0_0_0_/0.35)] transition-colors hover:border-cta/40 lg:hidden"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
        >
          <MessageSquare className="size-4" strokeWidth={1.5} aria-hidden />
          Discussion
          <span className="text-text-dim">{threadCount}</span>
        </button>
      ) : null}
    </>
  );
}

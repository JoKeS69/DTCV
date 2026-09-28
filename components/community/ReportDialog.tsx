"use client";

import { useState, useTransition } from "react";
import { createReport } from "@/app/actions/community";
import type { ReportTargetType } from "@/lib/generated/prisma/client";

export function ReportDialog({
  targetType,
  targetId,
  signedIn,
  onNeedAuth,
}: {
  targetType: ReportTargetType;
  targetId: string;
  signedIn: boolean;
  onNeedAuth: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="font-mono text-[9px] uppercase tracking-[0.14em] text-danger hover:underline"
        onClick={() => {
          if (!signedIn) return onNeedAuth();
          setOpen(true);
          setMessage(null);
        }}
      >
        Report
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report content"
        >
          <div className="w-full max-w-md border border-border bg-surface">
            <header className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
              &gt; File report
            </header>
            <div className="space-y-3 px-4 py-4">
              <p className="font-mono text-[11px] text-text-muted normal-case tracking-normal">
                Reports are reviewed by moderators. Use this for harassment,
                doxxing, unverified guilt claims, or spam.
              </p>
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
                Reason
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text normal-case tracking-normal"
                  maxLength={200}
                  required
                />
              </label>
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
                Details (optional)
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text normal-case tracking-normal"
                  maxLength={2000}
                />
              </label>
              {message ? (
                <p className="font-mono text-[10px] text-online">{message}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || reason.trim().length < 3}
                  className="border border-danger/50 bg-danger/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
                  onClick={() => {
                    startTransition(async () => {
                      const result = await createReport({
                        targetType,
                        targetId,
                        reason,
                        details: details.trim() || null,
                      });
                      if (!result.ok) {
                        setMessage(result.error);
                        return;
                      }
                      setMessage("Report filed.");
                      window.setTimeout(() => setOpen(false), 900);
                    });
                  }}
                >
                  Submit report
                </button>
                <button
                  type="button"
                  className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

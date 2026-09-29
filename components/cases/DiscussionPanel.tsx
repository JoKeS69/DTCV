import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { HudDiscussion } from "@/lib/cases/hud-data";

export function DiscussionPanel({
  caseCode,
  discussions,
}: {
  caseCode: string | null;
  discussions: HudDiscussion[];
}) {
  return (
    <section className="hud-panel flex h-full min-h-[200px] flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
        <span>
          &gt; DISCUSSION
          {caseCode ? ` (CASE ${caseCode})` : ""}
        </span>
        {caseCode ? (
          <Link
            href={`/cases?select=${caseCode}`}
            className="text-text-muted hover:text-text"
          >
            View all →
          </Link>
        ) : null}
      </header>
      <ul className="min-h-0 flex-1 divide-y divide-border/80 overflow-y-auto">
        {discussions.length === 0 ? (
          <li className="px-3 py-4 font-mono text-[10px] text-text-dim">
            No discussions on this file yet
          </li>
        ) : (
          discussions.map((d) => (
            <li key={d.id} className="px-2.5 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[8px] text-text-dim"
                  aria-hidden
                >
                  {d.avatarInitial}
                </span>
                <span className="font-mono text-[10px] text-text">
                  {d.authorUsername}
                </span>
                <span className="font-mono text-[9px] text-text-dim">
                  {d.createdLabel}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[11px] leading-snug text-text-muted normal-case tracking-normal">
                {d.body}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                <MessageSquare className="size-3" strokeWidth={1.25} aria-hidden />
                {d.replyCount} Reply
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

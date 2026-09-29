import { MessageSquare } from "lucide-react";
import type { HudDiscussion } from "@/lib/cases/hud-types";

export function DiscussionItem({ item }: { item: HudDiscussion }) {
  return (
    <article className="rounded-[6px] px-3 py-4 transition-colors hover:bg-surface-elevated/50">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated font-mono text-[12px] text-text-muted"
          aria-hidden
        >
          {item.avatarInitial}
        </span>
        <span className="font-mono text-[13px] text-text">{item.authorUsername}</span>
        <span className="font-mono text-[12px] text-text-dim">{item.createdLabel}</span>
      </div>
      <p className="mt-3 font-mono text-[14px] leading-relaxed text-text-muted normal-case tracking-normal">
        {item.body}
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-text-dim">
        <MessageSquare className="size-3.5" strokeWidth={1.5} aria-hidden />
        {item.replyCount} Reply
      </p>
    </article>
  );
}

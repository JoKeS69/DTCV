import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HudActivity } from "@/lib/cases/hud-types";

export function ActivityItem({ item }: { item: HudActivity }) {
  const body = (
    <div className="flex items-start gap-3 px-1 py-3.5">
      <span className="shrink-0 pt-0.5 font-mono text-[12px] tabular-nums text-text-dim">
        {item.time}
      </span>
      <span className="min-w-0 flex-1 font-mono text-[14px] leading-relaxed text-text-muted normal-case tracking-normal">
        {item.text}
      </span>
      <ChevronRight
        className="mt-0.5 size-4 shrink-0 text-text-dim"
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="block rounded-[6px] px-3 transition-colors hover:bg-surface-elevated/70"
      >
        {body}
      </Link>
    );
  }

  return <div className="px-3">{body}</div>;
}

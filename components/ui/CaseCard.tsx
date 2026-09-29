import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HudCase } from "@/lib/cases/hud-types";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function CaseCard({
  item,
  href,
  active,
}: {
  item: HudCase;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      data-active={active}
      className={[
        "case-row flex min-h-[88px] items-start gap-3 rounded-[8px] border border-border bg-surface-elevated/40 px-4 py-5 transition-colors",
        active ? "border-border-strong bg-selected" : "hover:border-border-strong",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[14px] font-medium tracking-[0.06em] text-text">
            {item.caseCode}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <p className="mt-2.5 font-mono text-[15px] leading-snug text-text">
          {item.title}
        </p>
        <p className="mt-2.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-muted">
          {item.locationShort}
          <span className="mx-2 text-text-dim">·</span>
          {item.type}
          <span className="mx-2 text-text-dim">·</span>
          {item.updatedLabel}
        </p>
      </div>
      <ChevronRight
        className="mt-1 size-4 shrink-0 text-text-dim"
        strokeWidth={1.5}
        aria-hidden
      />
    </Link>
  );
}

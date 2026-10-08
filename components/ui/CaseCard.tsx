import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
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
        "case-row flex min-h-[88px] items-start gap-3 rounded-[2px] border border-border bg-surface-elevated/50 px-4 py-5 transition-colors",
        active ? "border-accent/40 bg-selected" : "hover:border-accent/30",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <StatusBadge status={item.status} />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
            {item.type}
          </span>
        </div>
        <p className="mt-2.5 font-display text-[15px] font-semibold uppercase leading-snug tracking-[0.04em] text-text">
          {item.title}
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] uppercase tracking-[0.08em] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3 text-accent" strokeWidth={1.5} aria-hidden />
            {item.locationShort}
          </span>
          <span className="text-text-dim">{item.updatedLabel}</span>
        </p>
      </div>
      <ChevronRight
        className="mt-1 size-4 shrink-0 text-accent/60"
        strokeWidth={1.5}
        aria-hidden
      />
    </Link>
  );
}

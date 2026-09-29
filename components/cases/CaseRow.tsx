import Link from "next/link";
import type { HudCase } from "@/lib/cases/hud-data";
import { CaseStatusText } from "@/components/cases/CaseStatusText";

export function CaseRow({
  item,
  href,
  active,
  variant = "desktop",
}: {
  item: HudCase;
  href: string;
  active: boolean;
  variant?: "desktop" | "mobile";
}) {
  if (variant === "mobile") {
    return (
      <Link
        href={href}
        className={[
          "grid grid-cols-[70px_52px_minmax(0,1fr)_64px_72px_12px] items-center gap-1 border-b border-border/80 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.08em]",
          active ? "bg-selected" : "hover:bg-surface",
        ].join(" ")}
      >
        <span className="truncate text-text">{item.caseCode}</span>
        <span className="truncate text-text-muted">{item.locationShort}</span>
        <span className="truncate text-text-muted">{item.type}</span>
        <span>
          <CaseStatusText status={item.status} />
        </span>
        <span className="truncate text-right text-text-dim">{item.updatedLabel}</span>
        <span className="text-text-dim">&gt;</span>
      </Link>
    );
  }

  return (
    <tr
      className={[
        "border-b border-border/70 font-mono text-[11px]",
        active ? "bg-selected" : "hover:bg-surface/90",
      ].join(" ")}
    >
      <td className="px-2 py-1.5">
        <Link href={href} className="text-text">
          {item.caseCode}
        </Link>
      </td>
      <td className="px-2 py-1.5">
        <Link href={href} className="text-text">
          {item.title}
        </Link>
      </td>
      <td className="px-2 py-1.5 text-text-muted">{item.locationShort}</td>
      <td className="px-2 py-1.5 text-text-muted">{item.type}</td>
      <td className="px-2 py-1.5">
        <CaseStatusText status={item.status} />
      </td>
      <td className="px-2 py-1.5 text-text-dim">{item.updatedLabel}</td>
    </tr>
  );
}

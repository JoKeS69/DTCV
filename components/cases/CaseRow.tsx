import Link from "next/link";
import type { HudCase } from "@/lib/cases/hud-types";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function CaseRow({
  item,
  href,
  active,
}: {
  item: HudCase;
  href: string;
  active: boolean;
  variant?: "desktop" | "mobile";
}) {
  return (
    <tr
      data-active={active}
      className="case-row border-b border-border/80 font-mono text-[14px]"
    >
      <td className="h-[54px] px-5 py-0 align-middle xl:h-[56px] xl:px-6">
        <Link href={href} className="font-medium text-text">
          {item.caseCode}
        </Link>
      </td>
      <td className="max-w-[300px] truncate px-5 align-middle xl:px-6">
        <Link href={href} className="text-text">
          {item.title}
        </Link>
      </td>
      <td className="px-5 align-middle text-text-muted xl:px-6">
        {item.locationShort}
      </td>
      <td className="px-5 align-middle text-text-muted xl:px-6">{item.type}</td>
      <td className="px-5 align-middle xl:px-6">
        <StatusBadge status={item.status} />
      </td>
      <td className="whitespace-nowrap px-5 align-middle text-text-dim xl:px-6">
        {item.updatedLabel}
      </td>
    </tr>
  );
}

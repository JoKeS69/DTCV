import type { HudCaseStatus } from "@/lib/cases/hud-types";
import type { CaseStatus } from "@/lib/generated/prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Status = HudCaseStatus | CaseStatus;

/** Soft status pill — shared StatusBadge wrapper for existing call sites */
export function CaseStatusText({
  status,
  boxed = true,
}: {
  status: Status;
  boxed?: boolean;
}) {
  if (!boxed) {
    return (
      <span className={`font-mono text-[12px] uppercase tracking-[0.12em] status-${status}`}>
        {status}
      </span>
    );
  }
  return <StatusBadge status={status} />;
}

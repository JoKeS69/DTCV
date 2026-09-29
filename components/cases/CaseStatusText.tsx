import type { HudCaseStatus } from "@/lib/cases/hud-data";
import type { CaseStatus } from "@/lib/generated/prisma/client";

type Status = HudCaseStatus | CaseStatus;

export function CaseStatusText({
  status,
  boxed = true,
}: {
  status: Status;
  boxed?: boolean;
}) {
  if (!boxed) {
    return (
      <span className={`font-mono text-[10px] uppercase tracking-[0.14em] status-${status}`}>
        {status}
      </span>
    );
  }
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

import type { HudCaseStatus } from "@/lib/cases/hud-types";
import type { CaseStatus } from "@/lib/generated/prisma/client";

type Status = HudCaseStatus | CaseStatus;

export function StatusBadge({
  status,
  className = "",
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span className={["status-badge", `status-${status}`, className].join(" ")}>
      {status}
    </span>
  );
}

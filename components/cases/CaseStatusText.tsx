import type { CaseStatus } from "@/lib/generated/prisma/client";
import { statusClass } from "@/lib/cases/queries";

export function CaseStatusText({ status }: { status: CaseStatus }) {
  return (
    <span className={["font-mono text-[10px] uppercase tracking-[0.14em]", statusClass(status)].join(" ")}>
      {status}
    </span>
  );
}

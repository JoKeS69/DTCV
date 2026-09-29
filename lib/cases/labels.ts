import type { CaseStatus, ContentLabel } from "@/lib/generated/prisma/client";

export function labelClass(label: ContentLabel): string {
  switch (label) {
    case "VERIFIED":
      return "text-online border-online/40";
    case "REPORTED":
      return "text-amber border-amber/40";
    case "USER_THEORY":
      return "text-text-muted border-border-strong";
    default:
      return "text-text-muted border-border";
  }
}

export function statusClass(status: CaseStatus): string {
  switch (status) {
    case "OPEN":
      return "text-online";
    case "COLD":
      return "text-amber";
    case "UNSOLVED":
      return "text-unsolved";
    case "CLOSED":
      return "text-closed";
    default:
      return "text-text-muted";
  }
}

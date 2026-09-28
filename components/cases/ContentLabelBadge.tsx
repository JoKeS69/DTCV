import type { ContentLabel } from "@/lib/generated/prisma/client";
import { labelClass } from "@/lib/cases/labels";

const copy: Record<ContentLabel, string> = {
  VERIFIED: "Verified",
  REPORTED: "Reported",
  USER_THEORY: "User theory",
};

export function ContentLabelBadge({
  label,
  className = "",
}: {
  label: ContentLabel;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]",
        labelClass(label),
        className,
      ].join(" ")}
      title="Content safety label — not a guilt determination"
    >
      {copy[label]}
    </span>
  );
}

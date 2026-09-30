export function StatCard({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string;
  value: string | number;
  tone?: "online" | "amber" | "unsolved" | "closed" | "default";
  compact?: boolean;
}) {
  const toneClass =
    tone === "online"
      ? "text-online"
      : tone === "amber"
        ? "text-amber"
        : tone === "unsolved"
          ? "text-unsolved"
          : tone === "closed"
            ? "text-closed"
            : "text-text";

  return (
    <div
      className={[
        "rounded-[6px] border border-border bg-surface-elevated/60",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
      ].join(" ")}
    >
      <p
        className={[
          "font-mono uppercase tracking-[0.12em] text-text-dim",
          compact ? "text-[10px]" : "text-[12px]",
        ].join(" ")}
      >
        {label}
      </p>
      <p
        className={[
          "mt-0.5 font-mono font-semibold tabular-nums tracking-normal",
          compact ? "text-[14px]" : "text-[18px] xl:text-[20px]",
          toneClass,
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

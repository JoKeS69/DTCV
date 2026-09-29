export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "online" | "amber" | "unsolved" | "closed" | "default";
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
    <div className="rounded-[6px] border border-border bg-surface-elevated/60 px-3 py-2.5">
      <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-dim">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-mono text-[18px] font-semibold tabular-nums tracking-normal xl:text-[20px]",
          toneClass,
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

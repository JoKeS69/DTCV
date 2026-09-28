export function StatusDot({
  label = "System online",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted",
        className,
      ].join(" ")}
    >
      <span
        className="size-1.5 shrink-0 rounded-none bg-online motion-pulse-online"
        aria-hidden
      />
      <span className="text-online">{label}</span>
    </span>
  );
}

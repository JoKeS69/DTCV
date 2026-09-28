export type LoadingProps = {
  label?: string;
  className?: string;
};

export function Loading({
  label = "Loading systems…",
  className = "",
}: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-text-muted",
        className,
      ].join(" ")}
    >
      <span
        className="inline-block size-2 rounded-none bg-online motion-pulse-online"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center border border-border bg-surface/60 p-8">
      <Loading label={label} />
    </div>
  );
}

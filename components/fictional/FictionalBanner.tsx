export function FictionalBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "border border-amber/50 bg-amber/10 font-mono uppercase tracking-[0.14em] text-amber",
        compact
          ? "px-2 py-1 text-[9px]"
          : "px-3 py-2 text-[10px]",
      ].join(" ")}
    >
      FICTIONAL TRAINING CASE — not a real crime. No real persons harmed.
    </div>
  );
}

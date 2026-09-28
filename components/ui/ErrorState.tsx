import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({
  title = "Signal interrupted",
  message,
  onRetry,
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={[
        "rounded-none border border-danger/40 bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] p-5",
        className,
      ].join(" ")}
    >
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-danger">
        {title}
      </p>
      <p className="mt-2 max-w-prose text-sm text-text-muted">{message}</p>
      {(onRetry || action) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {onRetry ? (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {action}
        </div>
      )}
    </div>
  );
}

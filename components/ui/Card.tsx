import type { HTMLAttributes, ReactNode } from "react";

/**
 * Interaction container only — use for clickable/selectable surfaces.
 * Prefer open sections for static content.
 */
export type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  children: ReactNode;
};

export function Card({
  title,
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-none border border-border bg-surface/80 text-left transition-colors duration-200",
        "hover:border-border-strong hover:bg-surface-elevated/80",
        className,
      ].join(" ")}
      {...props}
    >
      {title ? (
        <header className="border-b border-border px-4 py-3">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-text">
            {title}
          </h3>
        </header>
      ) : null}
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

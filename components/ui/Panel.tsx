export function Panel({
  children,
  className = "",
  as: Tag = "section",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "aside" | "div";
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={["hud-panel flex min-h-0 flex-col", className].join(" ")}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  children,
  action,
  className = "",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={["hud-panel-title", className].join(" ")}>
      <span className="min-w-0 truncate">{children}</span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </header>
  );
}

export function PanelBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={["hud-panel-body min-h-0", className].join(" ")}>{children}</div>;
}

import type { ReactNode } from "react";
import Link from "next/link";

export function DemoChrome({
  product,
  children,
  extra,
}: {
  product: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="demo-chrome">
      <div className="demo-bar">
        <Link href="/#projects">← Portfolio</Link>
        <span className="demo-title">{product}</span>
        <div className="demo-bar-extra">{extra}</div>
      </div>
      {children}
    </div>
  );
}

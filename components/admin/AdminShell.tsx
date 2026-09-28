import { AdminNav } from "@/components/admin/AdminNav";

export function AdminShell({
  title,
  subtitle,
  current,
  children,
}: {
  title: string;
  subtitle?: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-6 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
        &gt; Command deck · ADMIN
      </p>
      <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.1em] text-text md:text-2xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-2xl font-mono text-[11px] text-text-muted normal-case tracking-normal">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-4">
        <AdminNav current={current} />
      </div>
      <div className="mt-4">{children}</div>
    </main>
  );
}

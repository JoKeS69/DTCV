import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** Shared CASE//NET HUD chrome — design-refs dashboard/mobile density. */
export function AppShell({
  children,
  activeCaseFiles,
}: {
  children: React.ReactNode;
  activeCaseFiles?: number;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter activeCaseFiles={activeCaseFiles} />
      <MobileBottomNav />
    </div>
  );
}

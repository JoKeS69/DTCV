import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { requireAdmin } from "@/lib/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side ADMIN gate for every /admin route (never trust client).
  await requireAdmin();

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}

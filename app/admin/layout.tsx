import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireAdmin } from "@/lib/admin/auth";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Admin");

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side ADMIN gate for every /admin route (never trust client).
  await requireAdmin();

  return <AppShell>{children}</AppShell>;
}

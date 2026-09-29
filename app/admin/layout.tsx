import type { Metadata } from "next";
import { CommandDeckServer } from "@/components/layout/CommandDeckServer";
import { requireAdmin } from "@/lib/admin/auth";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Admin");

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <CommandDeckServer>{children}</CommandDeckServer>;
}

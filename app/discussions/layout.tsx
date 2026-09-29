import { AppShell } from "@/components/layout/AppShell";

export default function DiscussionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

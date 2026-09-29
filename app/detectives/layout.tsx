import { AppShell } from "@/components/layout/AppShell";

export default function DetectivesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

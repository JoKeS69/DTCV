import { AppShell } from "@/components/layout/AppShell";

export default function FictionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

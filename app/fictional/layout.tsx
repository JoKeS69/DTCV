import { CommandDeckServer } from "@/components/layout/CommandDeckServer";

export default function FictionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommandDeckServer>{children}</CommandDeckServer>;
}

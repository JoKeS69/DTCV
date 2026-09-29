import { CommandDeckServer } from "@/components/layout/CommandDeckServer";

export default function DetectivesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommandDeckServer>{children}</CommandDeckServer>;
}

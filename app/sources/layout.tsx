import { CommandDeckServer } from "@/components/layout/CommandDeckServer";

export default function SourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommandDeckServer>{children}</CommandDeckServer>;
}

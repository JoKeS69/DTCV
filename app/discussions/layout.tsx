import { CommandDeckServer } from "@/components/layout/CommandDeckServer";

export default function DiscussionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommandDeckServer>{children}</CommandDeckServer>;
}

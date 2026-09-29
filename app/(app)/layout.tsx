import { CommandDeckServer } from "@/components/layout/CommandDeckServer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <CommandDeckServer>{children}</CommandDeckServer>;
}

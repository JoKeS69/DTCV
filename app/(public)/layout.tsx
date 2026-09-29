import { CommandDeckServer } from "@/components/layout/CommandDeckServer";

/** Public routes share command-deck chrome when not redirected. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommandDeckServer>{children}</CommandDeckServer>;
}

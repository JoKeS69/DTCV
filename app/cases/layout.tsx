import { CommandDeckServer } from "@/components/layout/CommandDeckServer";
import { HUD_STATS } from "@/lib/cases/hud-data";

export default function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommandDeckServer activeCaseFiles={HUD_STATS.total}>
      {children}
    </CommandDeckServer>
  );
}

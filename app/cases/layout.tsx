import { CommandDeckServer } from "@/components/layout/CommandDeckServer";
import { getCaseStatsCached } from "@/lib/cases/dashboard";

export default async function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { counts } = await getCaseStatsCached();
  return (
    <CommandDeckServer activeCaseFiles={counts.total}>
      {children}
    </CommandDeckServer>
  );
}

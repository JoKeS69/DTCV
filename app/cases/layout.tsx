import { CommandDeckServer } from "@/components/layout/CommandDeckServer";
import { getCaseStatsCached } from "@/lib/cases/dashboard";

export default async function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let activeCaseFiles = 0;
  try {
    const { counts } = await getCaseStatsCached();
    activeCaseFiles = counts.total;
  } catch {
    // Build / offline DB: shell still renders.
    activeCaseFiles = 0;
  }
  return (
    <CommandDeckServer activeCaseFiles={activeCaseFiles}>
      {children}
    </CommandDeckServer>
  );
}

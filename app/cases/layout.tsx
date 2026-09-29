import { CommandDeckServer } from "@/components/layout/CommandDeckServer";
import { getPrisma } from "@/lib/db";

export default async function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let activeCaseFiles: number | undefined;
  try {
    activeCaseFiles = await getPrisma().case.count({
      where: { published: true },
    });
  } catch {
    activeCaseFiles = undefined;
  }

  return (
    <CommandDeckServer activeCaseFiles={activeCaseFiles}>
      {children}
    </CommandDeckServer>
  );
}

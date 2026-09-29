import { AppShell } from "@/components/layout/AppShell";
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

  return <AppShell activeCaseFiles={activeCaseFiles}>{children}</AppShell>;
}

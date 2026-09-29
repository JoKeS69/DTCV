import { auth } from "@/auth";
import { CommandDeckShell } from "@/components/layout/CommandDeckShell";
import type { DeckUser } from "@/components/layout/CommandDeckSidebar";
import { getCaseStatsCached } from "@/lib/cases/dashboard";
import { getPrisma } from "@/lib/db";

export async function CommandDeckServer({
  children,
  activeCaseFiles,
}: {
  children: React.ReactNode;
  activeCaseFiles?: number;
}) {
  const session = await auth();
  let user: DeckUser = null;

  if (session?.user?.id) {
    try {
      const row = await getPrisma().user.findUnique({
        where: { id: session.user.id },
        select: {
          displayName: true,
          username: true,
          publicId: true,
          detectiveRank: true,
          suspendedAt: true,
        },
      });
      if (row && !row.suspendedAt) {
        user = {
          displayName: "DETECTIVE",
          publicId: row.publicId,
          rankLabel: row.detectiveRank || "NOVICE",
          status: "ACTIVE",
        };
      }
    } catch {
      user = {
        displayName: "DETECTIVE",
        publicId: "DET-LOCALDEV",
        rankLabel: "NOVICE",
        status: "ACTIVE",
      };
    }
  }

  let caseCount = activeCaseFiles;
  if (typeof caseCount !== "number") {
    try {
      const { counts } = await getCaseStatsCached();
      caseCount = counts.total;
    } catch {
      caseCount = 0;
    }
  }

  return (
    <CommandDeckShell user={user} activeCaseFiles={caseCount}>
      {children}
    </CommandDeckShell>
  );
}

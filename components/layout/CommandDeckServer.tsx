import { auth } from "@/auth";
import { CommandDeckShell } from "@/components/layout/CommandDeckShell";
import type { DeckUser } from "@/components/layout/CommandDeckSidebar";
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
          badgeNumber: true,
          detectiveRank: true,
          suspendedAt: true,
        },
      });
      if (row) {
        user = {
          // Mockup: USER block shows DETECTIVE / ID / RANK: NOVICE
          displayName: "DETECTIVE",
          badgeNumber: row.badgeNumber,
          rankLabel: row.detectiveRank,
          status: row.suspendedAt ? "SUSPENDED" : "ACTIVE",
        };
      }
    } catch {
      user = {
        displayName: "DETECTIVE",
        badgeNumber: null,
        rankLabel: "NOVICE",
        status: "ACTIVE",
      };
    }
  }

  return (
    <CommandDeckShell user={user} activeCaseFiles={activeCaseFiles}>
      {children}
    </CommandDeckShell>
  );
}

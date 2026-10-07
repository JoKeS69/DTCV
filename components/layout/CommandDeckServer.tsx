import { auth } from "@/auth";
import { CommandDeckShell } from "@/components/layout/CommandDeckShell";
import type { DeckUser } from "@/components/layout/deck-user";
import { getCaseStatsCached } from "@/lib/cases/dashboard";
import { getPrisma } from "@/lib/db";
import { canAccessPbCase } from "@/lib/pb-case/admin-username";

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
          role: true,
        },
      });
      if (row && !row.suspendedAt) {
        const label =
          row.displayName?.trim() || row.username?.trim() || "DETECTIVE";
        user = {
          displayName: label,
          publicId: row.publicId,
          rankLabel: row.detectiveRank || "NOVICE",
          status: "ACTIVE",
          role: row.role,
          username: row.username,
          // Exact same predicate as requirePbCaseAdmin — link only when gate would pass.
          canAccessPbCase: canAccessPbCase(row),
        };
      }
    } catch {
      // DB briefly unavailable: fall back to session role + username (JWT keeps both fresh).
      const role = session.user.role ?? "USER";
      const username = session.user.username ?? "";
      const label =
        session.user.displayName?.trim() || username || "DETECTIVE";
      user = {
        displayName: label,
        publicId: "DET-LOCALDEV",
        rankLabel: "NOVICE",
        status: "ACTIVE",
        role,
        username,
        canAccessPbCase: canAccessPbCase({ role, username }),
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

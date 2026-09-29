"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireActiveUser } from "@/lib/server/authz";

export async function toggleFollowCase(caseId: string, slug: string) {
  const gate = await requireActiveUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const published = await getPrisma().case.findFirst({
    where: { id: caseId, published: true },
    select: { id: true },
  });
  if (!published) return { ok: false, error: "Case not found" };

  const existing = await getPrisma().followedCase.findUnique({
    where: { userId_caseId: { userId: gate.user.id, caseId } },
  });

  if (existing) {
    await getPrisma().followedCase.delete({ where: { id: existing.id } });
  } else {
    await getPrisma().followedCase.create({
      data: { userId: gate.user.id, caseId },
    });
  }

  revalidatePath("/cases");
  revalidatePath(`/cases/${slug}`);
  return { ok: true, followed: !existing };
}

export async function toggleSaveCase(caseId: string, slug: string) {
  const gate = await requireActiveUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const published = await getPrisma().case.findFirst({
    where: { id: caseId, published: true },
    select: { id: true },
  });
  if (!published) return { ok: false, error: "Case not found" };

  const existing = await getPrisma().savedCase.findUnique({
    where: { userId_caseId: { userId: gate.user.id, caseId } },
  });

  if (existing) {
    await getPrisma().savedCase.delete({ where: { id: existing.id } });
  } else {
    await getPrisma().savedCase.create({
      data: { userId: gate.user.id, caseId },
    });
  }

  revalidatePath("/cases");
  revalidatePath(`/cases/${slug}`);
  return { ok: true, saved: !existing };
}

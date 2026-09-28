"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required", userId: null };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function toggleFollowCase(caseId: string, slug: string) {
  const gate = await requireUserId();
  if (!gate.ok || !gate.userId) return { ok: false, error: gate.error };

  const existing = await getPrisma().followedCase.findUnique({
    where: { userId_caseId: { userId: gate.userId, caseId } },
  });

  if (existing) {
    await getPrisma().followedCase.delete({ where: { id: existing.id } });
  } else {
    await getPrisma().followedCase.create({
      data: { userId: gate.userId, caseId },
    });
  }

  revalidatePath("/cases");
  revalidatePath(`/cases/${slug}`);
  return { ok: true, followed: !existing };
}

export async function toggleSaveCase(caseId: string, slug: string) {
  const gate = await requireUserId();
  if (!gate.ok || !gate.userId) return { ok: false, error: gate.error };

  const existing = await getPrisma().savedCase.findUnique({
    where: { userId_caseId: { userId: gate.userId, caseId } },
  });

  if (existing) {
    await getPrisma().savedCase.delete({ where: { id: existing.id } });
  } else {
    await getPrisma().savedCase.create({
      data: { userId: gate.userId, caseId },
    });
  }

  revalidatePath("/cases");
  revalidatePath(`/cases/${slug}`);
  return { ok: true, saved: !existing };
}

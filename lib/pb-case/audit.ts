import { getCasesPrisma } from "@/lib/cases-db";
import type { Prisma } from "@/lib/generated/prisma-cases/client";

export async function writeAuditLog(input: {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue | null;
}): Promise<void> {
  await getCasesPrisma().auditLog.create({
    data: {
      actor: input.actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      meta: input.meta ?? undefined,
    },
  });
}

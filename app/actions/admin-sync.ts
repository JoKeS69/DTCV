"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/db";
import { previewImportPayload } from "@/lib/sync/import";
import { syncAllSources, syncSource } from "@/lib/sync/run";
import { Prisma, type CaseDataSource } from "@/lib/generated/prisma/client";
import type { NormalizedCaseRecord } from "@/lib/sources/types";

export type AdminSyncActionResult =
  | { ok: true; message?: string; data?: unknown }
  | { ok: false; error: string };

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function revalidateSync(extra?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/sync");
  revalidatePath("/admin/cases");
  revalidatePath("/admin/import");
  revalidatePath("/admin/takedowns");
  revalidatePath("/cases");
  revalidateTag("cases-public", "max");
  if (extra) revalidatePath(extra);
}

export async function adminRunSync(
  source?: CaseDataSource,
): Promise<AdminSyncActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const results = source
      ? [await syncSource(source, { force: true })]
      : await syncAllSources({ force: true });
    revalidateSync();
    return { ok: true, message: "Sync finished", data: results };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
}

export async function adminPreviewImport(
  body: string,
  format: "json" | "csv",
): Promise<AdminSyncActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const rows = previewImportPayload(body, format);
    return {
      ok: true,
      data: {
        total: rows.length,
        okCount: rows.filter((r) => r.ok).length,
        rows: rows.slice(0, 50),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid import payload",
    };
  }
}

export async function adminCommitImport(
  body: string,
  format: "json" | "csv",
): Promise<AdminSyncActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };
  let rows;
  try {
    rows = previewImportPayload(body, format);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid import payload",
    };
  }
  const good = rows
    .map((r) => r.record)
    .filter((r): r is NormalizedCaseRecord => Boolean(r));
  if (!good.length) return { ok: false, error: "No valid rows to import" };

  const now = new Date();
  const prisma = getPrisma();
  let upserted = 0;
  for (const record of good) {
    const existing = await prisma.case.findFirst({
      where: { source: record.source, sourceId: record.sourceId },
      select: { id: true },
    });
    const active =
      record.sourcedStatus === "ACTIVE" || record.sourcedStatus === "UNKNOWN";
    const data = {
      title: record.name,
      summary: record.summary,
      publicNotes: record.tipsText,
      location: record.location,
      countryCode: record.countryCode,
      year: record.year,
      type: record.caseType,
      status: (active ? "OPEN" : "CLOSED") as "OPEN" | "CLOSED",
      contentLabel: "REPORTED" as const,
      published: active,
      publishedAt: active ? now : null,
      isDevStub: false,
      source: record.source,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl,
      sourceAttribution: record.sourceAttribution,
      aliases: record.aliases,
      agency: record.agency,
      lastKnown: record.lastKnown,
      tipsText: record.tipsText,
      sourceCategory: record.sourceCategory,
      sourcedStatus: record.sourcedStatus,
      lastSyncedAt: now,
      contentHash: record.contentHash,
      isHidden: false,
      rawPayload: asJson(record.rawPayload),
      lastVerifiedAt: now,
    };
    if (existing) {
      await prisma.case.update({ where: { id: existing.id }, data });
    } else {
      const code = `${record.source.toUpperCase().slice(0, 4)}-${record.sourceId}`.slice(
        0,
        64,
      );
      const slug =
        `${record.source}-${record.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 40)}-${record.sourceId.slice(0, 10)}`.slice(0, 120);
      await prisma.case.create({
        data: {
          ...data,
          caseCode: code,
          slug,
          firstSeenAt: now,
        },
      });
    }
    upserted += 1;
  }
  revalidateSync();
  return { ok: true, message: `Imported ${upserted} rows` };
}

export async function adminSetCaseOverride(
  caseId: string,
  hide: boolean,
  note: string,
): Promise<AdminSyncActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };
  await getPrisma().caseAdminOverride.upsert({
    where: { caseId },
    create: {
      caseId,
      hide,
      note: note.trim() || null,
      updatedBy: gate.admin.id,
    },
    update: {
      hide,
      note: note.trim() || null,
      updatedBy: gate.admin.id,
    },
  });
  if (hide) {
    await getPrisma().takedownLog.create({
      data: {
        caseId,
        reason: "admin_hide",
        note: note.trim() || null,
        actorId: gate.admin.id,
      },
    });
  }
  revalidateSync(`/admin/cases/${caseId}`);
  return { ok: true };
}

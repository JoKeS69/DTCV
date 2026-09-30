/**
 * Per-source sync: fetch → normalize → contentHash upsert → removal handling.
 * Concurrency: 1 per source (process-local lock). Failures leave last-good data.
 */

import { Prisma, type CaseDataSource, type CaseStatus } from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { getAdapter, listSyncableAdapters } from "@/lib/sources/registry";
import type { NormalizedCaseRecord } from "@/lib/sources/types";
import { slugify } from "@/lib/sources/http";
import { revalidateTag } from "next/cache";

const locks = new Set<CaseDataSource>();

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mapLegacyStatus(
  sourced: NormalizedCaseRecord["sourcedStatus"],
): CaseStatus {
  switch (sourced) {
    case "CAPTURED":
    case "RECOVERED":
    case "DECEASED":
    case "REMOVED_FROM_SOURCE":
      return "CLOSED";
    case "ACTIVE":
      return "OPEN";
    default:
      return "UNSOLVED";
  }
}

function caseCodeFor(record: NormalizedCaseRecord): string {
  const prefix = record.source.toUpperCase().slice(0, 4);
  return `${prefix}-${record.sourceId}`.slice(0, 64);
}

function uniqueSlug(record: NormalizedCaseRecord): string {
  const base = slugify(record.name) || "case";
  return `${record.source}-${base}-${record.sourceId.slice(0, 12)}`.slice(0, 120);
}

function toUpsertData(
  record: NormalizedCaseRecord,
  now: Date,
): Prisma.CaseUncheckedCreateInput {
  const active =
    record.sourcedStatus === "ACTIVE" ||
    record.sourcedStatus === "UNKNOWN";
  return {
    caseCode: caseCodeFor(record),
    title: record.name,
    slug: uniqueSlug(record),
    summary: record.summary,
    publicNotes: record.tipsText,
    location: record.location,
    countryCode: record.countryCode,
    year: record.year,
    type: record.caseType,
    status: mapLegacyStatus(record.sourcedStatus),
    priority: record.sourceCategory === "TEN_MOST_WANTED" ? "HIGH" : "MEDIUM",
    contentLabel: "VERIFIED",
    published: active,
    publishedAt: active ? now : null,
    isDevStub: false,
    source: record.source,
    sourceId: record.sourceId,
    sourceUrl: record.sourceUrl,
    sourceAttribution: record.sourceAttribution,
    aliases: record.aliases,
    demographics: asJson(record.demographics),
    physical: asJson(record.physical),
    lastKnown: record.lastKnown,
    agency: record.agency,
    tipsText: record.tipsText,
    images: asJson(record.images),
    sourceCategory: record.sourceCategory,
    sourcedStatus: record.sourcedStatus,
    sourceModifiedAt: record.sourceModifiedAt,
    firstSeenAt: now,
    lastSyncedAt: now,
    contentHash: record.contentHash,
    isHidden: false,
    rawPayload: asJson(record.rawPayload),
    lastVerifiedAt: now,
  };
}

async function upsertRecord(record: NormalizedCaseRecord, now: Date) {
  const prisma = getPrisma();
  const existing = await prisma.case.findFirst({
    where: { source: record.source, sourceId: record.sourceId },
    select: { id: true, contentHash: true, slug: true, caseCode: true },
  });

  if (existing && existing.contentHash === record.contentHash) {
    await prisma.case.update({
      where: { id: existing.id },
      data: {
        lastSyncedAt: now,
        lastVerifiedAt: now,
        // Re-assert visibility if previously removed then returned
        isHidden: false,
        sourcedStatus: record.sourcedStatus,
        status: mapLegacyStatus(record.sourcedStatus),
        published:
          record.sourcedStatus === "ACTIVE" ||
          record.sourcedStatus === "UNKNOWN",
      },
    });
    return { changed: false };
  }

  const data = toUpsertData(record, now);
  if (existing) {
    const { firstSeenAt: _fs, caseCode: _cc, slug: _slug, ...update } = data;
    void _fs;
    void _cc;
    void _slug;
    await prisma.case.update({
      where: { id: existing.id },
      data: {
        ...update,
        // Preserve stable identifiers
        caseCode: existing.caseCode,
        slug: existing.slug,
      },
    });
  } else {
    await prisma.case.create({ data });
  }

  // Ensure CaseSource citation row for FBI / attributed sources
  const row = await prisma.case.findFirst({
    where: { source: record.source, sourceId: record.sourceId },
    select: { id: true, sources: { select: { id: true, url: true }, take: 5 } },
  });
  if (row) {
    const hasUrl = row.sources.some((s) => s.url === record.sourceUrl);
    if (!hasUrl) {
      await prisma.caseSource.create({
        data: {
          caseId: row.id,
          title: record.sourceAttribution,
          url: record.sourceUrl,
          publisher: record.agency ?? record.source.toUpperCase(),
          accessedAt: now,
          citationNote: "Official source — tips only via this URL.",
        },
      });
    }
  }

  return { changed: true };
}

async function applyRemovals(
  source: CaseDataSource,
  seenIds: Set<string>,
  now: Date,
) {
  const prisma = getPrisma();
  const existing = await prisma.case.findMany({
    where: {
      source,
      sourcedStatus: { not: "REMOVED_FROM_SOURCE" },
      isDevStub: false,
    },
    select: { id: true, sourceId: true },
  });

  const missing = existing.filter(
    (c) => c.sourceId && !seenIds.has(c.sourceId),
  );
  if (missing.length === 0) {
    return { removed: 0, blocked: false };
  }

  const disappearRatio = missing.length / Math.max(1, existing.length);
  if (existing.length >= 20 && disappearRatio > 0.3) {
    return {
      removed: 0,
      blocked: true,
      reason: `Removal guard: ${missing.length}/${existing.length} (>30%) missing — skipping mass hide.`,
    };
  }

  for (const row of missing) {
    await prisma.case.update({
      where: { id: row.id },
      data: {
        sourcedStatus: "REMOVED_FROM_SOURCE",
        status: "CLOSED",
        isHidden: true,
        published: false,
        lastSyncedAt: now,
      },
    });
    await prisma.takedownLog.create({
      data: {
        caseId: row.id,
        source,
        sourceId: row.sourceId,
        reason: "removed_from_source",
        note: "Absent from successful full sync enumeration.",
      },
    });
  }

  return { removed: missing.length, blocked: false };
}

export type SyncSourceResult = {
  source: CaseDataSource;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  message: string;
  fetchedCount: number;
  upsertedCount: number;
  removedCount: number;
  skippedCount: number;
  errorCount: number;
};

async function recentSuccessfulSync(
  source: CaseDataSource,
  minIntervalMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - minIntervalMs);
  const recent = await getPrisma().syncRun.findFirst({
    where: {
      source,
      status: { in: ["SUCCESS", "PARTIAL"] },
      startedAt: { gte: since },
    },
    select: { id: true },
  });
  return Boolean(recent);
}

export async function syncSource(
  source: CaseDataSource,
  { force = false }: { force?: boolean } = {},
): Promise<SyncSourceResult> {
  const adapter = getAdapter(source);
  if (!adapter) {
    return {
      source,
      status: "SKIPPED",
      message: `No adapter registered for ${source} (INTERPOL is intentionally removed).`,
      fetchedCount: 0,
      upsertedCount: 0,
      removedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };
  }

  if (!adapter.isEnabled() && !force) {
    return {
      source,
      status: "SKIPPED",
      message: `${adapter.label} is disabled in this environment.`,
      fetchedCount: 0,
      upsertedCount: 0,
      removedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };
  }

  if (locks.has(source)) {
    return {
      source,
      status: "SKIPPED",
      message: "Sync already running for this source (concurrency=1).",
      fetchedCount: 0,
      upsertedCount: 0,
      removedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };
  }

  if (!force && (await recentSuccessfulSync(source, adapter.minIntervalMs))) {
    return {
      source,
      status: "SKIPPED",
      message: `Min interval not elapsed for ${source}.`,
      fetchedCount: 0,
      upsertedCount: 0,
      removedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };
  }

  locks.add(source);
  const prisma = getPrisma();
  const run = await prisma.syncRun.create({
    data: { source, status: "RUNNING" },
  });

  let upsertedCount = 0;
  let removedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let fetchedCount = 0;
  let message = "";

  try {
    const result = await adapter.fetchAll();
    fetchedCount = result.fetchedCount;
    skippedCount = result.skippedCount;
    const now = new Date();
    const seen = new Set<string>();

    for (const record of result.records) {
      try {
        const { changed } = await upsertRecord(record, now);
        seen.add(record.sourceId);
        if (changed) upsertedCount += 1;
      } catch (err) {
        errorCount += 1;
        console.error(
          `[sync:${source}] upsert failed for ${record.sourceId}`,
          err instanceof Error ? err.message : "error",
        );
      }
    }

    if (result.complete && errorCount === 0) {
      const removal = await applyRemovals(source, seen, now);
      removedCount = removal.removed;
      if (removal.blocked) {
        message = removal.reason ?? "Removal guard blocked mass hide.";
      }
    } else if (!result.complete) {
      message =
        result.warnings.join(" ") ||
        "Incomplete fetch — last-good data retained; removals skipped.";
    }

    const status =
      errorCount > 0
        ? "PARTIAL"
        : result.complete
          ? "SUCCESS"
          : "PARTIAL";

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        fetchedCount,
        upsertedCount,
        removedCount,
        skippedCount,
        errorCount,
        message: message || result.warnings.join(" ") || null,
        details: { warnings: result.warnings },
      },
    });

    try {
      revalidateTag("cases-public", "max");
    } catch {
      // ignore outside Next request context
    }

    return {
      source,
      status,
      message: message || `${adapter.label} sync ${status.toLowerCase()}`,
      fetchedCount,
      upsertedCount,
      removedCount,
      skippedCount,
      errorCount,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "sync failed";
    console.error(`[sync:${source}]`, errMsg);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        fetchedCount,
        upsertedCount,
        removedCount,
        skippedCount,
        errorCount: errorCount + 1,
        message: errMsg.slice(0, 500),
      },
    });
    return {
      source,
      status: "FAILED",
      message: errMsg,
      fetchedCount,
      upsertedCount,
      removedCount,
      skippedCount,
      errorCount: errorCount + 1,
    };
  } finally {
    locks.delete(source);
  }
}

export async function syncAllSources(
  opts: { force?: boolean; sources?: CaseDataSource[] } = {},
): Promise<SyncSourceResult[]> {
  const adapters = listSyncableAdapters();
  const selected = opts.sources?.length
    ? adapters.filter((a) => opts.sources!.includes(a.source))
    : adapters;
  const results: SyncSourceResult[] = [];
  // Concurrency 1 across sources as well for DB politeness during hourly cron.
  for (const adapter of selected) {
    results.push(await syncSource(adapter.source, { force: opts.force }));
  }
  return results;
}

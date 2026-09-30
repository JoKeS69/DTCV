/**
 * Manual CSV/JSON import for Europol / manual cases (admin only).
 * Preview-friendly: parse → validate → return rows; persist separately.
 */

import type { CaseType, SourcedCaseStatus } from "@/lib/generated/prisma/client";
import { stableHash } from "@/lib/sources/http";
import type { NormalizedCaseRecord } from "@/lib/sources/types";

export type ImportPreviewRow = {
  ok: boolean;
  errors: string[];
  record: NormalizedCaseRecord | null;
  raw: Record<string, unknown>;
};

const CASE_TYPES = new Set<string>([
  "DISAPPEARANCE",
  "HOMICIDE",
  "MISSING",
  "WANTED",
  "UNIDENTIFIED",
  "KIDNAPPING",
  "SEEKING_INFORMATION",
  "TERRORIST",
  "UNKNOWN",
  "OTHER",
]);

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function asRecord(row: Record<string, unknown>): ImportPreviewRow {
  const errors: string[] = [];
  const sourceRaw = String(row.source ?? "manual").toLowerCase();
  const source =
    sourceRaw === "europol" || sourceRaw === "manual" || sourceRaw === "interpol"
      ? (sourceRaw as "europol" | "manual" | "interpol")
      : null;
  if (!source) errors.push("source must be europol|manual|interpol");

  const sourceId = String(row.sourceId ?? row.id ?? "").trim();
  if (!sourceId) errors.push("sourceId required");

  const name = String(row.name ?? row.title ?? "").trim();
  if (!name) errors.push("name/title required");

  const sourceUrl = String(row.sourceUrl ?? row.url ?? "").trim();
  if (!sourceUrl) errors.push("sourceUrl required");

  const caseTypeRaw = String(row.caseType ?? row.type ?? "UNKNOWN").toUpperCase();
  const caseType = (
    CASE_TYPES.has(caseTypeRaw) ? caseTypeRaw : "UNKNOWN"
  ) as CaseType;

  const statusRaw = String(row.status ?? "ACTIVE").toUpperCase();
  const sourcedStatus = (
    [
      "ACTIVE",
      "CAPTURED",
      "RECOVERED",
      "DECEASED",
      "REMOVED_FROM_SOURCE",
      "UNKNOWN",
    ].includes(statusRaw)
      ? statusRaw
      : "UNKNOWN"
  ) as SourcedCaseStatus;

  if (errors.length || !source) {
    return { ok: false, errors, record: null, raw: row };
  }

  const aliases = String(row.aliases ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const record: NormalizedCaseRecord = {
    source,
    sourceId,
    sourceUrl,
    sourceAttribution: String(
      row.sourceAttribution ??
        (source === "europol" ? "Europol (manual import)" : "Manual import"),
    ),
    name,
    aliases,
    summary: String(row.summary ?? row.description ?? name),
    caseType,
    sourcedStatus,
    sourceCategory: String(row.category ?? source).toUpperCase() || null,
    location: String(row.location ?? "").trim() || null,
    countryCode: String(row.countryCode ?? "").trim().toUpperCase() || null,
    year: row.year ? Number(row.year) || null : null,
    agency: String(row.agency ?? "").trim() || null,
    lastKnown: String(row.lastKnown ?? "").trim() || null,
    tipsText:
      String(row.tipsText ?? "").trim() ||
      "Submit tips only via the official source URL.",
    demographics: null,
    physical: null,
    images: [],
    sourceModifiedAt: null,
    rawPayload: row,
    contentHash: stableHash({
      source,
      sourceId,
      name,
      sourceUrl,
      summary: row.summary ?? row.description ?? name,
      statusRaw,
    }),
  };

  return { ok: true, errors: [], record, raw: row };
}

export function previewImportPayload(
  body: string,
  format: "json" | "csv",
): ImportPreviewRow[] {
  if (format === "csv") {
    return parseCsv(body).map((row) => asRecord(row));
  }
  const parsed = JSON.parse(body) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { cases?: unknown }).cases)
      ? ((parsed as { cases: unknown[] }).cases)
      : [parsed];
  return rows.map((r) =>
    asRecord(
      r && typeof r === "object" ? (r as Record<string, unknown>) : { value: r },
    ),
  );
}

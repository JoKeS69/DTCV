/**
 * FBI Wanted adapter — PRIMARY enabled source (no API key).
 * GET https://api.fbi.gov/wanted/v1/list — paginate all items.
 */

import { fetchJsonWithRetry, sleep } from "@/lib/sources/http";
import { normalizeFbiItem } from "@/lib/sources/normalize/fbi";
import type {
  AdapterFetchResult,
  CaseSourceAdapter,
  NormalizedCaseRecord,
} from "@/lib/sources/types";

const FBI_LIST_URL = "https://api.fbi.gov/wanted/v1/list";
const PAGE_SIZE = 50;
const PAGE_DELAY_MS = 350;

type FbiListResponse = {
  total?: number;
  page?: number;
  items?: unknown[];
};

export const fbiAdapter: CaseSourceAdapter = {
  source: "fbi",
  label: "FBI Wanted",
  minIntervalMs: 55 * 60 * 1000, // ~hourly with small margin
  isEnabled() {
    return process.env.FBI_ENABLED !== "false";
  },
  async fetchAll(): Promise<AdapterFetchResult> {
    const records: NormalizedCaseRecord[] = [];
    const warnings: string[] = [];
    let skippedCount = 0;
    let page = 1;
    let total = Infinity;
    let fetchedRaw = 0;

    while ((page - 1) * PAGE_SIZE < total) {
      const url = `${FBI_LIST_URL}?pageSize=${PAGE_SIZE}&page=${page}`;
      const data = await fetchJsonWithRetry<FbiListResponse>(url, {
        timeoutMs: 25_000,
        maxRetries: 3,
      });
      const items = Array.isArray(data.items) ? data.items : [];
      if (typeof data.total === "number") total = data.total;
      else if (items.length === 0) total = (page - 1) * PAGE_SIZE;

      fetchedRaw += items.length;
      for (const item of items) {
        const normalized = normalizeFbiItem(item);
        if (!normalized) {
          skippedCount += 1;
          continue;
        }
        records.push(normalized);
      }

      if (items.length === 0) break;
      page += 1;
      if ((page - 1) * PAGE_SIZE < total) {
        await sleep(PAGE_DELAY_MS);
      }
    }

    if (records.length === 0) {
      warnings.push("FBI fetch completed but no in-scope records normalized.");
    }

    return {
      records,
      complete: true,
      fetchedCount: fetchedRaw,
      skippedCount,
      warnings,
    };
  },
};

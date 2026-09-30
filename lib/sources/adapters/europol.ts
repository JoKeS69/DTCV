/**
 * Europol — no scrape / automated collection.
 * Cases enter only via admin CSV/JSON import (manual source).
 */

import type {
  AdapterFetchResult,
  CaseSourceAdapter,
} from "@/lib/sources/types";

export const europolAdapter: CaseSourceAdapter = {
  source: "europol",
  label: "Europol (manual import only)",
  minIntervalMs: 24 * 60 * 60 * 1000,
  isEnabled() {
    return false;
  },
  async fetchAll(): Promise<AdapterFetchResult> {
    return {
      records: [],
      complete: false,
      fetchedCount: 0,
      skippedCount: 0,
      warnings: [
        "Europol has no automated adapter. Use admin CSV/JSON import only after confirming redistribution rights.",
      ],
    };
  },
};

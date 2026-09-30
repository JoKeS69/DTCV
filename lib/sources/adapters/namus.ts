/**
 * NamUs — disabled stub. Automated collection is not permitted without written
 * permission from namus@usdoj.gov.
 */

import type {
  AdapterFetchResult,
  CaseSourceAdapter,
} from "@/lib/sources/types";

export const namusAdapter: CaseSourceAdapter = {
  source: "namus",
  label: "NamUs",
  minIntervalMs: 24 * 60 * 60 * 1000,
  isEnabled() {
    return process.env.NAMUS_ENABLED === "true";
  },
  async fetchAll(): Promise<AdapterFetchResult> {
    if (!this.isEnabled()) {
      return {
        records: [],
        complete: false,
        fetchedCount: 0,
        skippedCount: 0,
        warnings: [
          "NamUs disabled. Automated collection requires written permission from namus@usdoj.gov. No scrape is implemented.",
        ],
      };
    }
    // Even if NAMUS_ENABLED flips true, refuse until a permitted adapter is built.
    return {
      records: [],
      complete: false,
      fetchedCount: 0,
      skippedCount: 0,
      warnings: [
        "NamUs flag enabled but no permitted API adapter is configured. Contact namus@usdoj.gov before any collection.",
      ],
    };
  },
};

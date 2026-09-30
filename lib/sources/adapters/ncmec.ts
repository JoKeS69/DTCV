/**
 * NCMEC Poster API adapter.
 *
 * - DISABLED until NCMEC_CLIENT_ID + NCMEC_CLIENT_SECRET are set AND the operator
 *   has registered with NCMEC and disclosed any AI use.
 * - Do NOT persist poster content as Case rows / source-of-truth.
 * - Live fetch only; optional short TTL memory cache for UX is not SoT.
 *
 * Official docs are not vendored in this repo. When credentials exist, wire the
 * real Poster API base URL + paths from NCMEC’s current documentation into
 * `NCMEC_API_BASE_URL` (and related env). Do not invent endpoints.
 */

import type {
  AdapterFetchResult,
  CaseSourceAdapter,
} from "@/lib/sources/types";

export type NcmecPosterLiveResult = {
  enabled: boolean;
  reason?: string;
  /** Opaque live poster payload from NCMEC — never written to Case.rawPayload as SoT. */
  poster?: unknown;
};

function credentialsPresent(): boolean {
  return Boolean(
    process.env.NCMEC_CLIENT_ID?.trim() &&
      process.env.NCMEC_CLIENT_SECRET?.trim(),
  );
}

/**
 * Live poster fetch for public display only.
 * Returns disabled until credentials + documented base URL are configured.
 */
export async function fetchNcmecPosterLive(
  posterId: string,
): Promise<NcmecPosterLiveResult> {
  if (!credentialsPresent()) {
    return {
      enabled: false,
      reason:
        "NCMEC Poster API disabled — set NCMEC_CLIENT_ID and NCMEC_CLIENT_SECRET after registering with NCMEC and disclosing AI use.",
    };
  }
  const base = process.env.NCMEC_API_BASE_URL?.trim();
  if (!base) {
    return {
      enabled: false,
      reason:
        "NCMEC credentials set but NCMEC_API_BASE_URL is missing. Provide the official Poster API base URL from NCMEC docs — do not invent paths.",
    };
  }
  // Intentionally not calling an invented path. Operator must supply docs-backed URL patterns.
  void posterId;
  return {
    enabled: false,
    reason:
      "NCMEC live client scaffold is gated: implement request/auth against official Poster API docs once base URL + auth flow are confirmed with NCMEC.",
  };
}

export const ncmecAdapter: CaseSourceAdapter = {
  source: "ncmec",
  label: "NCMEC (Poster API)",
  minIntervalMs: 60 * 60 * 1000,
  isEnabled() {
    // Sync must not write poster bodies into Case rows.
    return false;
  },
  async fetchAll(): Promise<AdapterFetchResult> {
    return {
      records: [],
      complete: false,
      fetchedCount: 0,
      skippedCount: 0,
      warnings: [
        "NCMEC adapter is intentionally disabled for Case sync. Fetch posters live via Poster API only; do not store poster content in the database.",
      ],
    };
  },
};

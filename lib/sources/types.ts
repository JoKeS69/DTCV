/**
 * Common interface for external case-data adapters.
 * Adapters fetch + normalize; persistence/sync lives in lib/sync.
 */

import type {
  CaseDataSource,
  CaseType,
  SourcedCaseStatus,
} from "@/lib/generated/prisma/client";

export type NormalizedCaseImage = {
  url: string;
  thumb?: string | null;
  caption?: string | null;
};

export type NormalizedCaseRecord = {
  source: CaseDataSource;
  sourceId: string;
  sourceUrl: string;
  sourceAttribution: string;
  name: string;
  aliases: string[];
  summary: string;
  caseType: CaseType;
  sourcedStatus: SourcedCaseStatus;
  sourceCategory: string | null;
  location: string | null;
  countryCode: string | null;
  year: number | null;
  agency: string | null;
  lastKnown: string | null;
  tipsText: string | null;
  demographics: Record<string, unknown> | null;
  physical: Record<string, unknown> | null;
  images: NormalizedCaseImage[];
  sourceModifiedAt: Date | null;
  /** Sanitized raw fields for admin — never treat as SoT for NCMEC posters. */
  rawPayload: Record<string, unknown> | null;
  contentHash: string;
};

export type AdapterFetchResult = {
  records: NormalizedCaseRecord[];
  /** True when the adapter completed a full successful enumeration. */
  complete: boolean;
  fetchedCount: number;
  skippedCount: number;
  warnings: string[];
};

export type CaseSourceAdapter = {
  source: CaseDataSource;
  /** Human label for admin / Sources page. */
  label: string;
  /** Whether this adapter may run in the current environment. */
  isEnabled(): boolean;
  /** Minimum interval between successful syncs (ms). */
  minIntervalMs: number;
  /**
   * Fetch + normalize. Disabled adapters throw or return empty with complete=false
   * only when explicitly skipped by the runner.
   */
  fetchAll(): Promise<AdapterFetchResult>;
};

export type AdapterRegistryEntry = {
  adapter: CaseSourceAdapter;
  /** When false, adapter is a documented stub (no network). */
  implemented: boolean;
  notes: string;
};

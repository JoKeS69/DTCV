/**
 * Source adapter registry.
 * INTERPOL: intentionally NOT registered — terms forbid reproducing wanted/missing
 * data on other sites and bots/data mining without written permission.
 * CIA: not used (no case data / Factbook retired) — documented in README only.
 */

import { europolAdapter } from "@/lib/sources/adapters/europol";
import { fbiAdapter } from "@/lib/sources/adapters/fbi";
import { namusAdapter } from "@/lib/sources/adapters/namus";
import { ncmecAdapter } from "@/lib/sources/adapters/ncmec";
import type { AdapterRegistryEntry, CaseSourceAdapter } from "@/lib/sources/types";
import type { CaseDataSource } from "@/lib/generated/prisma/client";

export const SOURCE_REGISTRY: AdapterRegistryEntry[] = [
  {
    adapter: fbiAdapter,
    implemented: true,
    notes:
      "PRIMARY. Public FBI Wanted API — no credentials. Attribute FBI + link sourceUrl.",
  },
  {
    adapter: ncmecAdapter,
    implemented: true,
    notes:
      "DISABLED until NCMEC_CLIENT_ID/SECRET + registration/AI disclosure. Live Poster API only — never persist poster content as Case SoT.",
  },
  {
    adapter: namusAdapter,
    implemented: false,
    notes:
      "Disabled stub. Permission required from namus@usdoj.gov. No scrape.",
  },
  {
    adapter: europolAdapter,
    implemented: false,
    notes:
      "No automated collection. Admin CSV/JSON import only (source=europol|manual).",
  },
];

export function getAdapter(source: CaseDataSource): CaseSourceAdapter | null {
  return SOURCE_REGISTRY.find((e) => e.adapter.source === source)?.adapter ?? null;
}

export function listSyncableAdapters(): CaseSourceAdapter[] {
  return SOURCE_REGISTRY.map((e) => e.adapter);
}

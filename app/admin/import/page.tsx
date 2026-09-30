import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { ImportPanel } from "@/components/admin/ImportPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Import" };

export default function AdminImportPage() {
  return (
    <AdminShell
      title="Manual import"
      subtitle="Europol and other partners: CSV/JSON only after confirming redistribution rights. No scrape. Preview before commit."
      current="/admin/import"
    >
      <ImportPanel />
      <p className="mt-4 font-mono text-[10px] text-text-dim normal-case tracking-normal">
        Required fields: source (europol|manual|interpol), sourceId, name/title,
        sourceUrl. Optional: summary, caseType, status, aliases (pipe-separated),
        location, countryCode, agency, tipsText.
      </p>
    </AdminShell>
  );
}

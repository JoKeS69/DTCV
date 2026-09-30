import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Sources and terms",
  description:
    "Attribution, licensing, and terms for DETECTIVE / CASE//NET case data sources.",
  path: "/sources",
});

const sources = [
  {
    name: "FBI Wanted",
    status: "Live (enabled)",
    attribution: "Federal Bureau of Investigation — Wanted program",
    url: "https://www.fbi.gov/wanted",
    api: "https://api.fbi.gov/wanted/v1/list",
    terms:
      "Public Wanted API, no API key. Each case attributes FBI and links to the official poster URL. Tips go only to the official FBI source.",
  },
  {
    name: "NCMEC (Poster API)",
    status: "Disabled until credentials + registration",
    attribution: "National Center for Missing & Exploited Children",
    url: "https://www.missingkids.org/",
    api: "Official Poster API (docs not vendored — configure NCMEC_API_BASE_URL from NCMEC docs)",
    terms:
      "Do not store poster content in our database. Fetch live via Poster API; show only the current version. Keep NCMEC notices intact. No ads, fundraising, or sponsorship adjacent to NCMEC content. Enable only after NCMEC_CLIENT_ID + NCMEC_CLIENT_SECRET are set and you have registered with NCMEC and disclosed any AI use.",
  },
  {
    name: "INTERPOL",
    status: "Not integrated (adapter removed)",
    attribution: "INTERPOL",
    url: "https://www.interpol.int/",
    api: "—",
    terms:
      "INTERPOL terms forbid reproducing wanted/missing data on other sites and forbid bots/data mining without written permission. DETECTIVE does not build or keep an INTERPOL adapter.",
  },
  {
    name: "NamUs",
    status: "Disabled stub — permission required",
    attribution: "National Missing and Unidentified Persons System (NamUs)",
    url: "https://www.namus.gov/",
    api: "—",
    terms:
      "No automated collection or scraping. Written permission required from namus@usdoj.gov before any integration.",
  },
  {
    name: "Europol",
    status: "Manual admin CSV/JSON import only",
    attribution: "Europol (when imported with rights clearance)",
    url: "https://www.europol.europa.eu/",
    api: "—",
    terms:
      "No scrape or automated collection. Cases may be imported by admins only after confirming redistribution rights.",
  },
  {
    name: "CIA",
    status: "Not used",
    attribution: "—",
    url: "—",
    api: "—",
    terms:
      "CIA is not a case-data source for DETECTIVE. The World Factbook retirement path is irrelevant to wanted/missing case files.",
  },
] as const;

export default function SourcesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href="/cases" className="hover:text-text">
          ← Case database
        </Link>
      </p>
      <h1 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.1em] text-text">
        Sources and terms
      </h1>
      <p className="mt-3 font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal">
        DETECTIVE / CASE//NET republishes only permitted, attributed case
        listings for wanted and missing/unidentified persons. We never host tip
        forms — tips go to the official source. No guilt declarations.
      </p>

      <div className="mt-6 space-y-4">
        {sources.map((source) => (
          <section
            key={source.name}
            className="border border-border bg-surface/40 px-4 py-4"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-mono text-[14px] uppercase tracking-[0.12em] text-text">
                {source.name}
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
                {source.status}
              </span>
            </header>
            <dl className="mt-3 space-y-2 font-mono text-[11px]">
              <div>
                <dt className="text-text-dim uppercase tracking-[0.12em]">
                  Attribution
                </dt>
                <dd className="mt-1 text-text-muted normal-case tracking-normal">
                  {source.attribution}
                </dd>
              </div>
              <div>
                <dt className="text-text-dim uppercase tracking-[0.12em]">
                  Official site
                </dt>
                <dd className="mt-1 break-all text-text-muted">
                  {source.url.startsWith("http") ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cta underline-offset-2 hover:underline"
                    >
                      {source.url}
                    </a>
                  ) : (
                    source.url
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-dim uppercase tracking-[0.12em]">
                  Integration
                </dt>
                <dd className="mt-1 break-all text-text-muted normal-case tracking-normal">
                  {source.api}
                </dd>
              </div>
              <div>
                <dt className="text-text-dim uppercase tracking-[0.12em]">
                  Terms / policy
                </dt>
                <dd className="mt-1 text-text-muted normal-case tracking-normal leading-relaxed">
                  {source.terms}
                </dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </main>
  );
}

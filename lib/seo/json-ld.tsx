/** Escape `</` so JSON-LD cannot break out of the script element. */
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Server-rendered JSON-LD. Public structured data only. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Public SEO payload — never include private user fields.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DETECTIVE",
    url: absoluteUrlSafe(),
    description:
      "Global detective investigation platform for sourced case files and fictional training.",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DETECTIVE",
    url: absoluteUrlSafe(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrlSafe()}/cases?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export function realCaseJsonLd(input: {
  caseCode: string;
  title: string;
  summary: string;
  slug: string;
  location?: string | null;
  year?: number | null;
  status: string;
  contentLabel: string;
  /** May be a Date or ISO string after unstable_cache serialization. */
  updatedAt: Date | string;
  sources: { title: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${input.caseCode} · ${input.title}`,
    description: input.summary.slice(0, 300),
    url: `${absoluteUrlSafe()}/cases/${input.slug}`,
    dateModified: toIso(input.updatedAt),
    about: {
      "@type": "Thing",
      name: input.title,
      description: `Status ${input.status}. Safety label ${input.contentLabel}. Not a guilt determination.`,
    },
    contentLocation: input.location
      ? { "@type": "Place", name: input.location }
      : undefined,
    citation: input.sources.slice(0, 10).map((s) => ({
      "@type": "CreativeWork",
      name: s.title,
      url: s.url,
    })),
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: "DETECTIVE",
    },
  };
}

function absoluteUrlSafe() {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return base;
}

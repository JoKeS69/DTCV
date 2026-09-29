import type { Metadata } from "next";
import { FeaturedSections } from "@/components/home/FeaturedSections";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { DEFAULT_DESCRIPTION } from "@/lib/seo/site";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Home",
    description: DEFAULT_DESCRIPTION,
    path: "/",
  }),
  // Avoid "DETECTIVE · DETECTIVE" from the root title template.
  title: { absolute: "DETECTIVE" },
  openGraph: {
    ...buildPageMetadata({
      title: "DETECTIVE",
      description: DEFAULT_DESCRIPTION,
      path: "/",
    }).openGraph,
    title: "DETECTIVE",
  },
  twitter: {
    ...buildPageMetadata({
      title: "DETECTIVE",
      description: DEFAULT_DESCRIPTION,
      path: "/",
    }).twitter,
    title: "DETECTIVE",
  },
};

export default function HomePage() {
  return (
    <main id="top">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <Hero />
      <FeaturedSections />
      <HowItWorks />
    </main>
  );
}

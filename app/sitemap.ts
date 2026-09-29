import type { MetadataRoute } from "next";
import { getPrisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo/site";

/** Public sitemap only — no private user, admin, or billing URLs. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/cases"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/fictional"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/fictional/rankings"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.5,
    },
  ];

  try {
    const [cases, fictional] = await Promise.all([
      getPrisma().case.findMany({
        where: { published: true, isDevStub: false },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      }),
      getPrisma().fictionalCase.findMany({
        where: { published: true, isFictional: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000,
      }),
    ]);

    return [
      ...staticEntries,
      ...cases.map((c) => ({
        url: absoluteUrl(`/cases/${c.slug}`),
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...fictional.map((c) => ({
        url: absoluteUrl(`/fictional/${c.slug}`),
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })),
    ];
  } catch {
    // Build-time / missing DATABASE_URL — still emit static public URLs.
    return staticEntries;
  }
}

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Crawl policy: public content indexable; private desks blocked.
 * Never allow admin, billing, checkout, or account surfaces.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/cases", "/fictional", "/pricing", "/detectives"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/billing",
          "/billing/",
          "/checkout",
          "/checkout/",
          "/profile",
          "/profile/",
          "/login",
          "/register",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}

import type { Metadata } from "next";
import { CookiesPage } from "@/components/legal/LegalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookie notice",
  path: "/legal/cookies",
  description: "Cookie notice (draft).",
});

export default function Page() {
  return <CookiesPage />;
}

import type { Metadata } from "next";
import { PrivacyPage } from "@/components/legal/LegalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  path: "/legal/privacy",
  description: "DETECTIVE / CASE//NET privacy policy (draft).",
});

export default function Page() {
  return <PrivacyPage />;
}

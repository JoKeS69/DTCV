import type { Metadata } from "next";
import { DisclaimerPage } from "@/components/legal/LegalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Disclaimer",
  path: "/legal/disclaimer",
  description: "DETECTIVE / CASE//NET disclaimer (draft).",
});

export default function Page() {
  return <DisclaimerPage />;
}

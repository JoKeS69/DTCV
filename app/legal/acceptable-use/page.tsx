import type { Metadata } from "next";
import { AcceptableUsePage } from "@/components/legal/LegalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Acceptable Use",
  path: "/legal/acceptable-use",
  description: "Acceptable use policy (draft).",
});

export default function Page() {
  return <AcceptableUsePage />;
}

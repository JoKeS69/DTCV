import type { Metadata } from "next";
import { CopyrightPage } from "@/components/legal/LegalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Copyright / Takedown",
  path: "/legal/copyright",
  description: "Copyright and takedown policy (draft).",
});

export default function Page() {
  return <CopyrightPage />;
}

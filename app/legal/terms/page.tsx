import type { Metadata } from "next";
import { TermsPage, termsMetadata } from "@/components/legal/LegalPages";

export const metadata: Metadata = termsMetadata;

export default function Page() {
  return <TermsPage />;
}

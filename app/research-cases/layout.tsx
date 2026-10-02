import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Research cases");

export default function ResearchCasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

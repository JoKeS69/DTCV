import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sources and terms",
  robots: { index: false, follow: false },
};

/** Public source listings are hidden — redirect to legal disclaimer. */
export default function SourcesPage() {
  redirect("/legal/disclaimer");
}

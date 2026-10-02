import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { requirePbCaseAdmin } from "@/lib/pb-case/auth";

export const metadata: Metadata = {
  ...privatePageMetadata("PB-CASE"),
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function PbCaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePbCaseAdmin();
  return (
    <div className="min-h-screen bg-bg text-text">
      {children}
    </div>
  );
}

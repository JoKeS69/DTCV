import { DemoChrome } from "@/components/projects/DemoChrome";
import { LedgerDashboard } from "@/components/projects/ledger/LedgerDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ledger — subscription billing dashboard",
  description: "Concept SaaS dashboard for MRR, churn and billing events.",
};

export default function LedgerPage() {
  return (
    <DemoChrome product="Ledger">
      <LedgerDashboard />
    </DemoChrome>
  );
}

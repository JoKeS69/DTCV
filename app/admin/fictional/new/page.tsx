import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { FictionalAdminForm } from "@/components/admin/FictionalAdminForm";

export const metadata: Metadata = { title: "Admin · New fictional" };

export default function AdminNewFictionalPage() {
  return (
    <AdminShell
      title="New fictional case"
      subtitle="Metadata editor. Suspects/evidence/solution continue via seed or later tooling."
      current="/admin/fictional"
    >
      <FictionalAdminForm />
    </AdminShell>
  );
}
